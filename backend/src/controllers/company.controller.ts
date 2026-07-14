import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { HttpError } from "../middleware/errorHandler";

const companySchema = z.object({
  name: z.string().min(2).max(150),
  type: z.enum(["HOLDING", "FILIALE"]),
  parentId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

const companyInclude = {
  parent: { select: { id: true, name: true, type: true } },
} as const;

async function wouldCreateCycle(companyId: string, newParentId: string): Promise<boolean> {
  let current: string | null = newParentId;
  const seen = new Set<string>();
  while (current) {
    if (current === companyId) return true;
    if (seen.has(current)) break;
    seen.add(current);
    const parent: { parentId: string | null } | null = await prisma.company.findUnique({
      where: { id: current },
      select: { parentId: true },
    });
    current = parent?.parentId ?? null;
  }
  return false;
}

export async function listCompanies(_req: Request, res: Response) {
  const companies = await prisma.company.findMany({
    include: companyInclude,
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
  res.json({ companies });
}

export async function createCompany(req: Request, res: Response) {
  const data = companySchema.parse(req.body);
  const existing = await prisma.company.findUnique({ where: { name: data.name } });
  if (existing) throw new HttpError(409, "Cette société existe déjà");

  if (data.parentId) {
    const parent = await prisma.company.findUnique({ where: { id: data.parentId } });
    if (!parent) throw new HttpError(400, "Société parente invalide");
  }

  const company = await prisma.company.create({ data, include: companyInclude });
  res.status(201).json({ company });
}

export async function updateCompany(req: Request, res: Response) {
  const data = companySchema.partial().parse(req.body);
  const company = await prisma.company.findUnique({ where: { id: req.params.id } });
  if (!company) throw new HttpError(404, "Société introuvable");

  if (data.parentId) {
    const parent = await prisma.company.findUnique({ where: { id: data.parentId } });
    if (!parent) throw new HttpError(400, "Société parente invalide");
    if (await wouldCreateCycle(company.id, data.parentId)) {
      throw new HttpError(400, "Cette société parente créerait une hiérarchie circulaire");
    }
  }

  const updated = await prisma.company.update({
    where: { id: req.params.id },
    data,
    include: companyInclude,
  });
  res.json({ company: updated });
}
