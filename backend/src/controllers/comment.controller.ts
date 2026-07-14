import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { HttpError } from "../middleware/errorHandler";
import { sendMail } from "../services/email.service";

const createCommentSchema = z.object({
  message: z.string().min(1).max(5000),
  isInternal: z.boolean().optional(),
});

export async function addComment(req: Request, res: Response) {
  const data = createCommentSchema.parse(req.body);
  const isStaff = req.user!.role === "AGENT" || req.user!.role === "ADMIN";

  const ticket = await prisma.ticket.findUnique({
    where: { id: req.params.id },
    include: { requester: true, assignee: true },
  });
  if (!ticket) throw new HttpError(404, "Ticket introuvable");
  if (!isStaff && ticket.requesterId !== req.user!.id) {
    throw new HttpError(403, "Accès refusé");
  }

  const isInternal = isStaff && Boolean(data.isInternal);

  const comment = await prisma.comment.create({
    data: {
      ticketId: ticket.id,
      authorId: req.user!.id,
      message: data.message,
      isInternal,
    },
    include: { author: { select: { id: true, name: true, role: true } } },
  });

  if (!isInternal) {
    const notifyTarget = req.user!.id === ticket.requesterId ? ticket.assignee : ticket.requester;
    if (notifyTarget) {
      void sendMail({
        to: notifyTarget.email,
        subject: `[${ticket.reference}] Nouveau commentaire`,
        text: `Nouveau commentaire sur le ticket "${ticket.title}" :\n\n${data.message}`,
      });
    }
  }

  res.status(201).json({ comment });
}
