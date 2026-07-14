import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { HttpError } from "../middleware/errorHandler";

const categorySchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

export async function listCategories(_req: Request, res: Response) {
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
  res.json({ categories });
}

export async function createCategory(req: Request, res: Response) {
  const data = categorySchema.parse(req.body);
  const existing = await prisma.category.findUnique({ where: { name: data.name } });
  if (existing) throw new HttpError(409, "Cette catégorie existe déjà");

  const category = await prisma.category.create({ data });
  res.status(201).json({ category });
}

export async function updateCategory(req: Request, res: Response) {
  const data = categorySchema.partial().parse(req.body);
  const category = await prisma.category.findUnique({ where: { id: req.params.id } });
  if (!category) throw new HttpError(404, "Catégorie introuvable");

  const updated = await prisma.category.update({ where: { id: req.params.id }, data });
  res.json({ category: updated });
}
