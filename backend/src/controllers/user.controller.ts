import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { HttpError } from "../middleware/errorHandler";
import { hashPassword } from "../utils/password";
import { generatePassword } from "../utils/generatePassword";
import { sendMail } from "../services/email.service";
import { renderSimpleEmail, escapeHtml } from "../services/emailTemplate";
import { getDeletedUserId } from "../services/deletedPlaceholder.service";

const optionalText = () =>
  z
    .string()
    .max(120)
    .nullable()
    .optional()
    .transform((v) => (v ? v.trim() || null : null));

const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  role: z.enum(["ADMIN", "AGENT", "USER"]).default("USER"),
  companyId: z.string().min(1, "La société est requise"),
  serviceId: z.string().nullable().optional(),
  managerId: z.string().nullable().optional(),
  isDepartmentHead: z.boolean().optional(),
  matricule: optionalText(),
  phone: optionalText(),
  pcName: optionalText(),
  anydeskId: optionalText(),
  teamviewerId: optionalText(),
  ultraviewerId: optionalText(),
});

const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  role: z.enum(["ADMIN", "AGENT", "USER"]).optional(),
  isActive: z.boolean().optional(),
  serviceId: z.string().nullable().optional(),
  managerId: z.string().nullable().optional(),
  companyId: z.string().optional(),
  isDepartmentHead: z.boolean().optional(),
  matricule: optionalText(),
  phone: optionalText(),
  pcName: optionalText(),
  anydeskId: optionalText(),
  teamviewerId: optionalText(),
  ultraviewerId: optionalText(),
});

const publicSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  service: { select: { id: true, name: true } },
  manager: { select: { id: true, name: true } },
  isActive: true,
  isDepartmentHead: true,
  isSystemPlaceholder: true,
  createdAt: true,
  company: true,
  matricule: true,
  phone: true,
  pcName: true,
  anydeskId: true,
  teamviewerId: true,
  ultraviewerId: true,
  avatarUrl: true,
} as const;

async function wouldCreateManagerCycle(userId: string, newManagerId: string): Promise<boolean> {
  let current: string | null = newManagerId;
  const seen = new Set<string>();
  while (current) {
    if (current === userId) return true;
    if (seen.has(current)) break;
    seen.add(current);
    const manager: { managerId: string | null } | null = await prisma.user.findUnique({
      where: { id: current },
      select: { managerId: true },
    });
    current = manager?.managerId ?? null;
  }
  return false;
}

async function assertServiceBelongsToCompany(serviceId: string, companyId: string) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { services: { where: { id: serviceId }, select: { id: true } } },
  });
  if (!company || company.services.length === 0) {
    throw new HttpError(400, "Ce service n'est pas activé pour cette société");
  }
}

export async function listCompanyDirectory(req: Request, res: Response) {
  const requester = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { companyId: true } });
  if (!requester) throw new HttpError(404, "Utilisateur introuvable");

  const users = await prisma.user.findMany({
    where: { companyId: requester.companyId, isActive: true },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
  res.json({ users });
}

export async function listUsers(req: Request, res: Response) {
  const { companyId } = req.query as { companyId?: string };
  const users = await prisma.user.findMany({
    where: { isSystemPlaceholder: false, ...(companyId ? { companyId } : {}) },
    select: publicSelect,
    orderBy: { name: "asc" },
  });
  res.json({ users });
}

export async function getUser(req: Request, res: Response) {
  const user = await prisma.user.findUnique({ where: { id: req.params.id }, select: publicSelect });
  if (!user) throw new HttpError(404, "Utilisateur introuvable");
  res.json({ user });
}

export async function listAgents(_req: Request, res: Response) {
  const agents = await prisma.user.findMany({
    where: { role: { in: ["AGENT", "ADMIN"] }, isActive: true },
    select: publicSelect,
    orderBy: { name: "asc" },
  });
  res.json({ agents });
}

export async function createUser(req: Request, res: Response) {
  const data = createUserSchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new HttpError(409, "Un compte existe déjà avec cet email");

  const company = await prisma.company.findUnique({ where: { id: data.companyId } });
  if (!company || !company.isActive) throw new HttpError(400, "Société invalide");

  if (data.serviceId) {
    await assertServiceBelongsToCompany(data.serviceId, data.companyId);
  }

  if (data.managerId) {
    const manager = await prisma.user.findUnique({ where: { id: data.managerId } });
    if (!manager || manager.companyId !== data.companyId) {
      throw new HttpError(400, "Le supérieur hiérarchique doit appartenir à la même société");
    }
  }

  const generatedPassword = generatePassword();
  const passwordHash = await hashPassword(generatedPassword);
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role,
      companyId: data.companyId,
      serviceId: data.serviceId || null,
      managerId: data.managerId || null,
      isDepartmentHead: data.isDepartmentHead ?? false,
      matricule: data.matricule ?? null,
      phone: data.phone ?? null,
      pcName: data.pcName ?? null,
      anydeskId: data.anydeskId ?? null,
      teamviewerId: data.teamviewerId ?? null,
      ultraviewerId: data.ultraviewerId ?? null,
    },
    select: publicSelect,
  });

  const accountMail = renderSimpleEmail({
    heading: "Votre compte ITicket a été créé",
    bodyHtml: `Bonjour ${escapeHtml(user.name)},<br /><br />Votre compte ITicket a été créé.<br /><br />
      <strong>Email :</strong> ${escapeHtml(user.email)}<br />
      <strong>Mot de passe temporaire :</strong> ${escapeHtml(generatedPassword)}<br /><br />
      Vous pouvez le modifier à tout moment depuis « Mon compte » une fois connecté.<br /><br />
      L'équipe IT Meninx Holding`,
    bodyText: `Bonjour ${user.name},\n\nVotre compte ITicket a été créé.\n\nEmail : ${user.email}\nMot de passe temporaire : ${generatedPassword}\n\nVous pouvez le modifier à tout moment depuis « Mon compte » une fois connecté.\n\nL'équipe IT Meninx Holding`,
  });
  await sendMail({ to: user.email, subject: "Votre compte ITicket a été créé", ...accountMail });

  res.status(201).json({ user, generatedPassword });
}

export async function updateUser(req: Request, res: Response) {
  const data = updateUserSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) throw new HttpError(404, "Utilisateur introuvable");

  if (user.isSystemPlaceholder) {
    throw new HttpError(400, "Ce compte système ne peut pas être modifié");
  }

  const targetCompanyId = data.companyId ?? user.companyId;

  if (data.companyId) {
    const company = await prisma.company.findUnique({ where: { id: data.companyId } });
    if (!company) throw new HttpError(400, "Société invalide");
  }

  if (data.email && data.email !== user.email) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new HttpError(409, "Un compte existe déjà avec cet email");
  }

  if (data.serviceId) {
    await assertServiceBelongsToCompany(data.serviceId, targetCompanyId);
  }

  if (data.managerId) {
    if (data.managerId === user.id) {
      throw new HttpError(400, "Un utilisateur ne peut pas être son propre supérieur hiérarchique");
    }
    const manager = await prisma.user.findUnique({ where: { id: data.managerId } });
    if (!manager || manager.companyId !== targetCompanyId) {
      throw new HttpError(400, "Le supérieur hiérarchique doit appartenir à la même société");
    }
    if (await wouldCreateManagerCycle(user.id, data.managerId)) {
      throw new HttpError(400, "Ce supérieur hiérarchique créerait une hiérarchie circulaire");
    }
  }

  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: {
      ...data,
      serviceId: data.serviceId === undefined ? undefined : data.serviceId || null,
      managerId: data.managerId === undefined ? undefined : data.managerId || null,
    },
    select: publicSelect,
  });
  res.json({ user: updated });
}

export async function deleteUser(req: Request, res: Response) {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) throw new HttpError(404, "Utilisateur introuvable");

  if (user.isSystemPlaceholder) {
    throw new HttpError(400, "Ce compte système ne peut pas être supprimé");
  }
  if (req.user!.id === user.id) {
    throw new HttpError(400, "Vous ne pouvez pas supprimer votre propre compte");
  }

  const deletedUserId = await getDeletedUserId();

  await prisma.$transaction(async (tx) => {
    // Le fil de discussion personnel de l'utilisateur est propre à lui : on le retire entièrement
    // plutôt que de le rattacher au compte générique (pas de sens à transférer une conversation privée).
    const ownThread = await tx.chatThread.findUnique({ where: { userId: user.id } });
    if (ownThread) {
      await tx.chatReadState.deleteMany({ where: { threadId: ownThread.id } });
      await tx.chatMessage.deleteMany({ where: { threadId: ownThread.id } });
      await tx.chatThread.delete({ where: { id: ownThread.id } });
    }
    // Messages envoyés par cet utilisateur dans d'autres fils (ex. réponses d'un agent) : conservés, ré-attribués.
    await tx.chatMessage.updateMany({ where: { senderId: user.id }, data: { senderId: deletedUserId } });
    await tx.chatReadState.deleteMany({ where: { userId: user.id } });

    await tx.comment.updateMany({ where: { authorId: user.id }, data: { authorId: deletedUserId } });
    await tx.attachment.updateMany({ where: { uploadedById: user.id }, data: { uploadedById: deletedUserId } });
    await tx.knowledgeArticle.updateMany({ where: { authorId: user.id }, data: { authorId: deletedUserId } });
    await tx.processApproval.updateMany({ where: { approverId: user.id }, data: { approverId: deletedUserId } });
    await tx.processStepCompletion.updateMany({ where: { doneById: user.id }, data: { doneById: deletedUserId } });
    await tx.asset.updateMany({ where: { assigneeId: user.id }, data: { assigneeId: deletedUserId } });
    await tx.ticketStatusHistory.updateMany({ where: { changedById: user.id }, data: { changedById: deletedUserId } });

    await tx.ticket.updateMany({ where: { requesterId: user.id }, data: { requesterId: deletedUserId } });
    await tx.ticket.updateMany({ where: { assigneeId: user.id }, data: { assigneeId: deletedUserId } });
    await tx.ticket.updateMany({ where: { beneficiaryId: user.id }, data: { beneficiaryId: deletedUserId } });
    await tx.ticket.updateMany({
      where: { physicalFormArchivedById: user.id },
      data: { physicalFormArchivedById: deletedUserId },
    });

    await tx.user.delete({ where: { id: user.id } });
  });

  res.status(204).send();
}

export async function resetUserPassword(req: Request, res: Response) {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) throw new HttpError(404, "Utilisateur introuvable");

  const generatedPassword = generatePassword();
  const passwordHash = await hashPassword(generatedPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  const resetMail = renderSimpleEmail({
    heading: "Votre mot de passe ITicket a été réinitialisé",
    bodyHtml: `Bonjour ${escapeHtml(user.name)},<br /><br />Votre mot de passe ITicket a été réinitialisé par un administrateur.<br /><br />
      <strong>Email :</strong> ${escapeHtml(user.email)}<br />
      <strong>Nouveau mot de passe temporaire :</strong> ${escapeHtml(generatedPassword)}<br /><br />
      Vous pouvez le modifier à tout moment depuis « Mon compte » une fois connecté.<br /><br />
      L'équipe IT Meninx Holding`,
    bodyText: `Bonjour ${user.name},\n\nVotre mot de passe ITicket a été réinitialisé par un administrateur.\n\nEmail : ${user.email}\nNouveau mot de passe temporaire : ${generatedPassword}\n\nVous pouvez le modifier à tout moment depuis « Mon compte » une fois connecté.\n\nL'équipe IT Meninx Holding`,
  });
  await sendMail({ to: user.email, subject: "Votre mot de passe ITicket a été réinitialisé", ...resetMail });

  res.json({ generatedPassword });
}

export async function listRemoteAccess(_req: Request, res: Response) {
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      OR: [
        { anydeskId: { not: null } },
        { teamviewerId: { not: null } },
        { ultraviewerId: { not: null } },
        { phone: { not: null } },
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      pcName: true,
      anydeskId: true,
      teamviewerId: true,
      ultraviewerId: true,
      company: { select: { id: true, name: true } },
      service: { select: { id: true, name: true } },
    },
    orderBy: [{ company: { name: "asc" } }, { name: "asc" }],
  });
  res.json({ users });
}
