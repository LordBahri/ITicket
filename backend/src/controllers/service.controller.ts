import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { HttpError } from "../middleware/errorHandler";

const serviceSchema = z.object({
  name: z.string().min(2).max(100),
  isActive: z.boolean().optional(),
});

export async function listServices(_req: Request, res: Response) {
  const services = await prisma.service.findMany({ orderBy: { name: "asc" } });
  res.json({ services });
}

export async function createService(req: Request, res: Response) {
  const data = serviceSchema.parse(req.body);
  const existing = await prisma.service.findUnique({ where: { name: data.name } });
  if (existing) throw new HttpError(409, "Ce service existe déjà");

  const service = await prisma.service.create({ data });
  res.status(201).json({ service });
}

export async function updateService(req: Request, res: Response) {
  const data = serviceSchema.partial().parse(req.body);
  const service = await prisma.service.findUnique({ where: { id: req.params.id } });
  if (!service) throw new HttpError(404, "Service introuvable");

  const updated = await prisma.service.update({ where: { id: req.params.id }, data });
  res.json({ service: updated });
}
