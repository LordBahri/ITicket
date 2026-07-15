import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { HttpError } from "../middleware/errorHandler";

const assetTypeSchema = z.object({
  name: z.string().min(2).max(100),
  isActive: z.boolean().optional(),
});

export async function listAssetTypes(_req: Request, res: Response) {
  const assetTypes = await prisma.assetType.findMany({ orderBy: { name: "asc" } });
  res.json({ assetTypes });
}

export async function createAssetType(req: Request, res: Response) {
  const data = assetTypeSchema.parse(req.body);
  const existing = await prisma.assetType.findUnique({ where: { name: data.name } });
  if (existing) throw new HttpError(409, "Ce type de matériel existe déjà");

  const assetType = await prisma.assetType.create({ data });
  res.status(201).json({ assetType });
}

export async function updateAssetType(req: Request, res: Response) {
  const data = assetTypeSchema.partial().parse(req.body);
  const assetType = await prisma.assetType.findUnique({ where: { id: req.params.id } });
  if (!assetType) throw new HttpError(404, "Type de matériel introuvable");

  const updated = await prisma.assetType.update({ where: { id: req.params.id }, data });
  res.json({ assetType: updated });
}
