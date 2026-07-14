import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { HttpError } from "../middleware/errorHandler";

const prioritySchema = z.object({
  name: z.string().min(2).max(50),
  level: z.number().int().min(0).max(10).optional(),
  color: z.string().max(20).optional(),
  responseTimeHours: z.number().int().min(1).max(24 * 30),
  resolutionTimeHours: z.number().int().min(1).max(24 * 90),
});

export async function listPriorities(_req: Request, res: Response) {
  const priorities = await prisma.priority.findMany({ orderBy: { level: "desc" } });
  res.json({ priorities });
}

export async function createPriority(req: Request, res: Response) {
  const data = prioritySchema.parse(req.body);
  const existing = await prisma.priority.findUnique({ where: { name: data.name } });
  if (existing) throw new HttpError(409, "Cette priorité existe déjà");

  const priority = await prisma.priority.create({ data });
  res.status(201).json({ priority });
}

export async function updatePriority(req: Request, res: Response) {
  const data = prioritySchema.partial().parse(req.body);
  const priority = await prisma.priority.findUnique({ where: { id: req.params.id } });
  if (!priority) throw new HttpError(404, "Priorité introuvable");

  const updated = await prisma.priority.update({ where: { id: req.params.id }, data });
  res.json({ priority: updated });
}
