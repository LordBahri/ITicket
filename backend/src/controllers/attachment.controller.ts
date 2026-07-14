import type { Request, Response } from "express";
import fs from "fs";
import { prisma } from "../config/prisma";
import { HttpError } from "../middleware/errorHandler";
import { attachmentPath } from "../middleware/upload";

function assertAccess(req: Request, ticket: { requesterId: string }) {
  const isStaff = req.user!.role === "AGENT" || req.user!.role === "ADMIN";
  if (!isStaff && ticket.requesterId !== req.user!.id) {
    throw new HttpError(403, "Accès refusé");
  }
}

export async function uploadAttachments(req: Request, res: Response) {
  const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
  if (!ticket) throw new HttpError(404, "Ticket introuvable");
  assertAccess(req, ticket);

  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (files.length === 0) throw new HttpError(400, "Aucun fichier fourni");

  const attachments = await Promise.all(
    files.map((file) =>
      prisma.attachment.create({
        data: {
          ticketId: ticket.id,
          filename: file.originalname,
          url: file.filename,
          uploadedById: req.user!.id,
        },
      })
    )
  );

  res.status(201).json({ attachments });
}

export async function listAttachments(req: Request, res: Response) {
  const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
  if (!ticket) throw new HttpError(404, "Ticket introuvable");
  assertAccess(req, ticket);

  const attachments = await prisma.attachment.findMany({
    where: { ticketId: ticket.id },
    orderBy: { createdAt: "asc" },
  });
  res.json({ attachments });
}

export async function downloadAttachment(req: Request, res: Response) {
  const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
  if (!ticket) throw new HttpError(404, "Ticket introuvable");
  assertAccess(req, ticket);

  const attachment = await prisma.attachment.findUnique({ where: { id: req.params.attachmentId } });
  if (!attachment || attachment.ticketId !== ticket.id) throw new HttpError(404, "Pièce jointe introuvable");

  const filePath = attachmentPath(ticket.id, attachment.url);
  if (!fs.existsSync(filePath)) throw new HttpError(404, "Fichier introuvable");

  res.download(filePath, attachment.filename);
}
