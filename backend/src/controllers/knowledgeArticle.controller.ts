import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { HttpError } from "../middleware/errorHandler";

const articleSchema = z.object({
  title: z.string().min(3).max(200),
  content: z.string().min(10).max(20000),
  categoryId: z.string().nullable().optional(),
  isPublished: z.boolean().optional(),
});

const DIACRITICS_REGEX = new RegExp("[\\u0300-\\u036f]", "g");

function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(DIACRITICS_REGEX, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

async function uniqueSlug(title: string): Promise<string> {
  const base = slugify(title) || "article";
  let slug = base;
  let suffix = 1;
  while (await prisma.knowledgeArticle.findUnique({ where: { slug } })) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  return slug;
}

export async function listArticles(req: Request, res: Response) {
  const isStaff = req.user!.role === "AGENT" || req.user!.role === "ADMIN";
  const { categoryId, search } = req.query as { categoryId?: string; search?: string };

  const where: Record<string, unknown> = {};
  if (!isStaff) where.isPublished = true;
  if (categoryId) where.categoryId = categoryId;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { content: { contains: search, mode: "insensitive" } },
    ];
  }

  const articles = await prisma.knowledgeArticle.findMany({
    where,
    include: { category: true, author: { select: { id: true, name: true } } },
    orderBy: { updatedAt: "desc" },
  });
  res.json({ articles });
}

export async function getArticle(req: Request, res: Response) {
  const isStaff = req.user!.role === "AGENT" || req.user!.role === "ADMIN";
  const article = await prisma.knowledgeArticle.findUnique({
    where: { id: req.params.id },
    include: { category: true, author: { select: { id: true, name: true } } },
  });
  if (!article || (!article.isPublished && !isStaff)) {
    throw new HttpError(404, "Article introuvable");
  }
  res.json({ article });
}

export async function createArticle(req: Request, res: Response) {
  const data = articleSchema.parse(req.body);
  const slug = await uniqueSlug(data.title);

  const article = await prisma.knowledgeArticle.create({
    data: {
      title: data.title,
      content: data.content,
      categoryId: data.categoryId ?? null,
      isPublished: data.isPublished ?? true,
      slug,
      authorId: req.user!.id,
    },
    include: { category: true, author: { select: { id: true, name: true } } },
  });
  res.status(201).json({ article });
}

export async function updateArticle(req: Request, res: Response) {
  const data = articleSchema.partial().parse(req.body);
  const existing = await prisma.knowledgeArticle.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new HttpError(404, "Article introuvable");

  const article = await prisma.knowledgeArticle.update({
    where: { id: req.params.id },
    data,
    include: { category: true, author: { select: { id: true, name: true } } },
  });
  res.json({ article });
}

export async function deleteArticle(req: Request, res: Response) {
  const existing = await prisma.knowledgeArticle.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new HttpError(404, "Article introuvable");

  await prisma.knowledgeArticle.delete({ where: { id: req.params.id } });
  res.status(204).send();
}
