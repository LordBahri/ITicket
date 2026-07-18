import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { HttpError } from "../middleware/errorHandler";

const categorySchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  ticketTypeId: z.string(),
  isActive: z.boolean().optional(),
});

export async function listCategories(req: Request, res: Response) {
  const { ticketTypeId } = req.query as { ticketTypeId?: string };
  const categories = await prisma.category.findMany({
    where: ticketTypeId ? { ticketTypeId } : undefined,
    include: { ticketType: { select: { id: true, name: true } } },
    orderBy: { name: "asc" },
  });
  res.json({ categories });
}

export async function getCategory(req: Request, res: Response) {
  const category = await prisma.category.findUnique({
    where: { id: req.params.id },
    include: {
      ticketType: { select: { id: true, name: true } },
      subCategories: { include: { priority: true }, orderBy: { name: "asc" } },
      _count: { select: { tickets: true } },
    },
  });
  if (!category) throw new HttpError(404, "Catégorie introuvable");
  res.json({ category });
}

export async function createCategory(req: Request, res: Response) {
  const data = categorySchema.parse(req.body);

  const ticketType = await prisma.ticketType.findUnique({ where: { id: data.ticketTypeId } });
  if (!ticketType) throw new HttpError(400, "Type de demande invalide");

  const existing = await prisma.category.findUnique({
    where: { ticketTypeId_name: { ticketTypeId: data.ticketTypeId, name: data.name } },
  });
  if (existing) throw new HttpError(409, "Cette catégorie existe déjà pour ce type de demande");

  const category = await prisma.category.create({ data, include: { ticketType: { select: { id: true, name: true } } } });
  res.status(201).json({ category });
}

export async function updateCategory(req: Request, res: Response) {
  const data = categorySchema.partial().parse(req.body);
  const category = await prisma.category.findUnique({ where: { id: req.params.id } });
  if (!category) throw new HttpError(404, "Catégorie introuvable");

  if (data.ticketTypeId) {
    const ticketType = await prisma.ticketType.findUnique({ where: { id: data.ticketTypeId } });
    if (!ticketType) throw new HttpError(400, "Type de demande invalide");
  }

  if (data.name || data.ticketTypeId) {
    const effectiveTicketTypeId = data.ticketTypeId ?? category.ticketTypeId;
    const effectiveName = data.name ?? category.name;
    const existing = await prisma.category.findUnique({
      where: { ticketTypeId_name: { ticketTypeId: effectiveTicketTypeId, name: effectiveName } },
    });
    if (existing && existing.id !== category.id) {
      throw new HttpError(409, "Cette catégorie existe déjà pour ce type de demande");
    }
  }

  const updated = await prisma.category.update({
    where: { id: req.params.id },
    data,
    include: { ticketType: { select: { id: true, name: true } } },
  });
  res.json({ category: updated });
}
