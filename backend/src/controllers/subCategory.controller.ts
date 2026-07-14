import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { HttpError } from "../middleware/errorHandler";

const subCategorySchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  categoryId: z.string(),
  isActive: z.boolean().optional(),
});

export async function listSubCategories(req: Request, res: Response) {
  const { categoryId } = req.query as { categoryId?: string };
  const subCategories = await prisma.subCategory.findMany({
    where: categoryId ? { categoryId } : undefined,
    orderBy: { name: "asc" },
  });
  res.json({ subCategories });
}

export async function createSubCategory(req: Request, res: Response) {
  const data = subCategorySchema.parse(req.body);
  const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
  if (!category) throw new HttpError(400, "Catégorie invalide");

  const existing = await prisma.subCategory.findUnique({
    where: { categoryId_name: { categoryId: data.categoryId, name: data.name } },
  });
  if (existing) throw new HttpError(409, "Cette sous-catégorie existe déjà pour cette catégorie");

  const subCategory = await prisma.subCategory.create({ data });
  res.status(201).json({ subCategory });
}

export async function updateSubCategory(req: Request, res: Response) {
  const data = subCategorySchema.partial().parse(req.body);
  const subCategory = await prisma.subCategory.findUnique({ where: { id: req.params.id } });
  if (!subCategory) throw new HttpError(404, "Sous-catégorie introuvable");

  const updated = await prisma.subCategory.update({ where: { id: req.params.id }, data });
  res.json({ subCategory: updated });
}
