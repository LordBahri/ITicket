import type { Request, Response } from "express";
import fs from "fs";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { HttpError } from "../middleware/errorHandler";
import { emitNewChatMessage, emitChatThreadCreated } from "../realtime/chatBus";
import { chatAttachmentPath } from "../middleware/chatUpload";

const sendMessageSchema = z.object({
  body: z.string().min(1).max(4000),
});

const sendAttachmentSchema = z.object({
  caption: z.string().max(4000).nullable().optional(),
});

const threadUserSelect = { id: true, name: true, email: true, avatarUrl: true, role: true } as const;

function isStaff(role: string) {
  return role === "AGENT" || role === "ADMIN";
}

async function ensureThreadForUser(userId: string) {
  return prisma.chatThread.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

async function assertThreadAccess(req: Request, thread: { userId: string }) {
  if (!isStaff(req.user!.role) && thread.userId !== req.user!.id) {
    throw new HttpError(403, "Accès refusé");
  }
}

async function unreadCountFor(threadId: string, userId: string) {
  const readState = await prisma.chatReadState.findUnique({
    where: { threadId_userId: { threadId, userId } },
  });
  return prisma.chatMessage.count({
    where: {
      threadId,
      senderId: { not: userId },
      createdAt: readState ? { gt: readState.lastReadAt } : undefined,
    },
  });
}

async function summarize(threadId: string, userId: string) {
  const [lastMessage, unreadCount] = await Promise.all([
    prisma.chatMessage.findFirst({ where: { threadId }, orderBy: { createdAt: "desc" } }),
    unreadCountFor(threadId, userId),
  ]);
  return { lastMessage, unreadCount };
}

export async function listThreads(req: Request, res: Response) {
  if (!isStaff(req.user!.role)) {
    const thread = await ensureThreadForUser(req.user!.id);
    const user = await prisma.user.findUnique({ where: { id: thread.userId }, select: threadUserSelect });
    const { lastMessage, unreadCount } = await summarize(thread.id, req.user!.id);
    return res.json({
      threads: [{ id: thread.id, user, lastMessage, unreadCount, updatedAt: thread.updatedAt }],
    });
  }

  const threads = await prisma.chatThread.findMany({
    orderBy: { updatedAt: "desc" },
    include: { user: { select: threadUserSelect } },
  });

  const detailed = await Promise.all(
    threads.map(async (thread) => {
      const { lastMessage, unreadCount } = await summarize(thread.id, req.user!.id);
      return { id: thread.id, user: thread.user, lastMessage, unreadCount, updatedAt: thread.updatedAt };
    })
  );

  res.json({ threads: detailed });
}

export async function startThreadWithUser(req: Request, res: Response) {
  const targetUserId = req.params.userId;
  if (!isStaff(req.user!.role) && req.user!.id !== targetUserId) {
    throw new HttpError(403, "Accès refusé");
  }

  const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!targetUser) throw new HttpError(404, "Utilisateur introuvable");
  if (isStaff(targetUser.role)) {
    throw new HttpError(400, "Impossible de démarrer une conversation avec un membre du support");
  }

  const existing = await prisma.chatThread.findUnique({ where: { userId: targetUserId } });
  const thread = existing ?? (await ensureThreadForUser(targetUserId));
  const user = await prisma.user.findUnique({ where: { id: targetUserId }, select: threadUserSelect });

  if (!existing) {
    emitChatThreadCreated({ thread: { id: thread.id, user, lastMessage: null, unreadCount: 0, updatedAt: thread.updatedAt } });
  }

  res.json({ thread: { id: thread.id, user } });
}

export async function getMessages(req: Request, res: Response) {
  const thread = await prisma.chatThread.findUnique({ where: { id: req.params.id } });
  if (!thread) throw new HttpError(404, "Conversation introuvable");
  await assertThreadAccess(req, thread);

  const messages = await prisma.chatMessage.findMany({
    where: { threadId: thread.id },
    orderBy: { createdAt: "asc" },
    include: { sender: { select: threadUserSelect } },
    take: 300,
  });

  res.json({ messages });
}

async function finalizeNewMessage(thread: { id: string; userId: string }, message: { id: string; createdAt: Date }, senderId: string) {
  await prisma.chatThread.update({ where: { id: thread.id }, data: { updatedAt: message.createdAt } });
  await prisma.chatReadState.upsert({
    where: { threadId_userId: { threadId: thread.id, userId: senderId } },
    update: { lastReadAt: message.createdAt },
    create: { threadId: thread.id, userId: senderId, lastReadAt: message.createdAt },
  });
  emitNewChatMessage({ threadId: thread.id, threadOwnerId: thread.userId, message });
}

export async function sendMessage(req: Request, res: Response) {
  const data = sendMessageSchema.parse(req.body);
  const thread = await prisma.chatThread.findUnique({ where: { id: req.params.id } });
  if (!thread) throw new HttpError(404, "Conversation introuvable");
  await assertThreadAccess(req, thread);

  const message = await prisma.chatMessage.create({
    data: { threadId: thread.id, senderId: req.user!.id, body: data.body },
    include: { sender: { select: threadUserSelect } },
  });

  await finalizeNewMessage(thread, message, req.user!.id);

  res.status(201).json({ message });
}

export async function sendAttachment(req: Request, res: Response) {
  if (!req.file) throw new HttpError(400, "Aucun fichier fourni");

  const data = sendAttachmentSchema.parse(req.body);
  const thread = await prisma.chatThread.findUnique({ where: { id: req.params.id } });
  if (!thread) throw new HttpError(404, "Conversation introuvable");
  await assertThreadAccess(req, thread);

  const message = await prisma.chatMessage.create({
    data: {
      threadId: thread.id,
      senderId: req.user!.id,
      body: data.caption || null,
      attachmentUrl: req.file.filename,
      attachmentName: req.file.originalname,
      attachmentMime: req.file.mimetype,
      attachmentSize: req.file.size,
    },
    include: { sender: { select: threadUserSelect } },
  });

  await finalizeNewMessage(thread, message, req.user!.id);

  res.status(201).json({ message });
}

export async function downloadAttachment(req: Request, res: Response) {
  const thread = await prisma.chatThread.findUnique({ where: { id: req.params.id } });
  if (!thread) throw new HttpError(404, "Conversation introuvable");
  await assertThreadAccess(req, thread);

  const message = await prisma.chatMessage.findUnique({ where: { id: req.params.messageId } });
  if (!message || message.threadId !== thread.id || !message.attachmentUrl) {
    throw new HttpError(404, "Pièce jointe introuvable");
  }

  const filePath = chatAttachmentPath(thread.id, message.attachmentUrl);
  if (!fs.existsSync(filePath)) throw new HttpError(404, "Fichier introuvable");

  res.download(filePath, message.attachmentName ?? message.attachmentUrl);
}

export async function markThreadRead(req: Request, res: Response) {
  const thread = await prisma.chatThread.findUnique({ where: { id: req.params.id } });
  if (!thread) throw new HttpError(404, "Conversation introuvable");
  await assertThreadAccess(req, thread);

  await prisma.chatReadState.upsert({
    where: { threadId_userId: { threadId: thread.id, userId: req.user!.id } },
    update: { lastReadAt: new Date() },
    create: { threadId: thread.id, userId: req.user!.id, lastReadAt: new Date() },
  });

  res.status(204).send();
}
