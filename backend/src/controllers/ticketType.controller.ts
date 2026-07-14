import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { HttpError } from "../middleware/errorHandler";

const ticketTypeSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

export async function listTicketTypes(_req: Request, res: Response) {
  const ticketTypes = await prisma.ticketType.findMany({ orderBy: { name: "asc" } });
  res.json({ ticketTypes });
}

export async function createTicketType(req: Request, res: Response) {
  const data = ticketTypeSchema.parse(req.body);
  const existing = await prisma.ticketType.findUnique({ where: { name: data.name } });
  if (existing) throw new HttpError(409, "Ce type de demande existe déjà");

  const ticketType = await prisma.ticketType.create({ data });
  res.status(201).json({ ticketType });
}

export async function updateTicketType(req: Request, res: Response) {
  const data = ticketTypeSchema.partial().parse(req.body);
  const ticketType = await prisma.ticketType.findUnique({ where: { id: req.params.id } });
  if (!ticketType) throw new HttpError(404, "Type de demande introuvable");

  const updated = await prisma.ticketType.update({ where: { id: req.params.id }, data });
  res.json({ ticketType: updated });
}
