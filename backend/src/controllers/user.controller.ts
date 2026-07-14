import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { HttpError } from "../middleware/errorHandler";

const updateUserSchema = z.object({
  role: z.enum(["ADMIN", "AGENT", "USER"]).optional(),
  isActive: z.boolean().optional(),
  service: z.string().max(100).optional(),
  companyId: z.string().optional(),
});

const publicSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  service: true,
  isActive: true,
  createdAt: true,
  company: true,
} as const;

export async function listUsers(_req: Request, res: Response) {
  const users = await prisma.user.findMany({ select: publicSelect, orderBy: { name: "asc" } });
  res.json({ users });
}

export async function listAgents(_req: Request, res: Response) {
  const agents = await prisma.user.findMany({
    where: { role: { in: ["AGENT", "ADMIN"] }, isActive: true },
    select: publicSelect,
    orderBy: { name: "asc" },
  });
  res.json({ agents });
}

export async function updateUser(req: Request, res: Response) {
  const data = updateUserSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) throw new HttpError(404, "Utilisateur introuvable");

  if (data.companyId) {
    const company = await prisma.company.findUnique({ where: { id: data.companyId } });
    if (!company) throw new HttpError(400, "Société invalide");
  }

  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data,
    select: publicSelect,
  });
  res.json({ user: updated });
}
