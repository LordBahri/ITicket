import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { HttpError } from "../middleware/errorHandler";

const subCategorySchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  categoryId: z.string(),
  priorityId: z.string(),
  isActive: z.boolean().optional(),
});

const subCategoryInclude = {
  category: { select: { id: true, name: true, ticketTypeId: true } },
  priority: true,
} as const;

export async function listSubCategories(req: Request, res: Response) {
  const { categoryId } = req.query as { categoryId?: string };
  const subCategories = await prisma.subCategory.findMany({
    where: categoryId ? { categoryId } : undefined,
    include: subCategoryInclude,
    orderBy: { name: "asc" },
  });
  res.json({ subCategories });
}

export async function getSubCategory(req: Request, res: Response) {
  const subCategory = await prisma.subCategory.findUnique({
    where: { id: req.params.id },
    include: { ...subCategoryInclude, _count: { select: { tickets: true } } },
  });
  if (!subCategory) throw new HttpError(404, "Sous-catégorie introuvable");
  res.json({ subCategory });
}

export async function createSubCategory(req: Request, res: Response) {
  const data = subCategorySchema.parse(req.body);
  const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
  if (!category) throw new HttpError(400, "Catégorie invalide");

  const priority = await prisma.priority.findUnique({ where: { id: data.priorityId } });
  if (!priority) throw new HttpError(400, "Priorité invalide");

  const existing = await prisma.subCategory.findUnique({
    where: { categoryId_name: { categoryId: data.categoryId, name: data.name } },
  });
  if (existing) throw new HttpError(409, "Cette sous-catégorie existe déjà pour cette catégorie");

  const subCategory = await prisma.subCategory.create({ data, include: subCategoryInclude });
  res.status(201).json({ subCategory });
}

export async function updateSubCategory(req: Request, res: Response) {
  const data = subCategorySchema.partial().parse(req.body);
  const subCategory = await prisma.subCategory.findUnique({ where: { id: req.params.id } });
  if (!subCategory) throw new HttpError(404, "Sous-catégorie introuvable");

  if (data.categoryId) {
    const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
    if (!category) throw new HttpError(400, "Catégorie invalide");
  }

  if (data.priorityId) {
    const priority = await prisma.priority.findUnique({ where: { id: data.priorityId } });
    if (!priority) throw new HttpError(400, "Priorité invalide");
  }

  if (data.name || data.categoryId) {
    const effectiveCategoryId = data.categoryId ?? subCategory.categoryId;
    const effectiveName = data.name ?? subCategory.name;
    const existing = await prisma.subCategory.findUnique({
      where: { categoryId_name: { categoryId: effectiveCategoryId, name: effectiveName } },
    });
    if (existing && existing.id !== subCategory.id) {
      throw new HttpError(409, "Cette sous-catégorie existe déjà pour cette catégorie");
    }
  }

  const updated = await prisma.subCategory.update({
    where: { id: req.params.id },
    data,
    include: subCategoryInclude,
  });
  res.json({ subCategory: updated });
}
