import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { HttpError } from "../middleware/errorHandler";

const sageDatabaseSchema = z.object({
  name: z.string().min(1).max(100),
  isActive: z.boolean().optional(),
});

export async function listSageDatabases(_req: Request, res: Response) {
  const sageDatabases = await prisma.sageDatabase.findMany({ orderBy: { name: "asc" } });
  res.json({ sageDatabases });
}

export async function createSageDatabase(req: Request, res: Response) {
  const data = sageDatabaseSchema.parse(req.body);
  const existing = await prisma.sageDatabase.findUnique({ where: { name: data.name } });
  if (existing) throw new HttpError(409, "Cette base Sage existe déjà");

  const sageDatabase = await prisma.sageDatabase.create({ data });
  res.status(201).json({ sageDatabase });
}

export async function updateSageDatabase(req: Request, res: Response) {
  const data = sageDatabaseSchema.partial().parse(req.body);
  const sageDatabase = await prisma.sageDatabase.findUnique({ where: { id: req.params.id } });
  if (!sageDatabase) throw new HttpError(404, "Base Sage introuvable");

  if (data.name) {
    const existing = await prisma.sageDatabase.findUnique({ where: { name: data.name } });
    if (existing && existing.id !== sageDatabase.id) throw new HttpError(409, "Cette base Sage existe déjà");
  }

  const updated = await prisma.sageDatabase.update({ where: { id: req.params.id }, data });
  res.json({ sageDatabase: updated });
}

export async function deleteSageDatabase(req: Request, res: Response) {
  const sageDatabase = await prisma.sageDatabase.findUnique({ where: { id: req.params.id } });
  if (!sageDatabase) throw new HttpError(404, "Base Sage introuvable");

  const [userAccessCount, ticketAccessCount] = await Promise.all([
    prisma.userSageAccess.count({ where: { sageDatabaseId: sageDatabase.id } }),
    prisma.ticketSageDatabaseAccess.count({ where: { sageDatabaseId: sageDatabase.id } }),
  ]);
  if (userAccessCount > 0 || ticketAccessCount > 0) {
    throw new HttpError(409, "Cette base Sage est affectée à au moins un utilisateur ou un ticket : désactivez-la plutôt que de la supprimer");
  }

  await prisma.sageDatabase.delete({ where: { id: sageDatabase.id } });
  res.status(204).send();
}
