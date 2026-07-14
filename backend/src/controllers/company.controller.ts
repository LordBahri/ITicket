import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { HttpError } from "../middleware/errorHandler";

const companySchema = z.object({
  name: z.string().min(2).max(150),
  type: z.enum(["HOLDING", "FILIALE"]),
  isActive: z.boolean().optional(),
});

export async function listCompanies(_req: Request, res: Response) {
  const companies = await prisma.company.findMany({ orderBy: [{ type: "asc" }, { name: "asc" }] });
  res.json({ companies });
}

export async function createCompany(req: Request, res: Response) {
  const data = companySchema.parse(req.body);
  const existing = await prisma.company.findUnique({ where: { name: data.name } });
  if (existing) throw new HttpError(409, "Cette société existe déjà");

  const company = await prisma.company.create({ data });
  res.status(201).json({ company });
}

export async function updateCompany(req: Request, res: Response) {
  const data = companySchema.partial().parse(req.body);
  const company = await prisma.company.findUnique({ where: { id: req.params.id } });
  if (!company) throw new HttpError(404, "Société introuvable");

  const updated = await prisma.company.update({ where: { id: req.params.id }, data });
  res.json({ company: updated });
}
