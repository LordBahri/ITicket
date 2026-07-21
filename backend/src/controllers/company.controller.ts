import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { HttpError } from "../middleware/errorHandler";
import { getDeletedCompanyId } from "../services/deletedPlaceholder.service";

const companySchema = z.object({
  name: z.string().min(2).max(150),
  type: z.enum(["HOLDING", "FILIALE"]),
  parentId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  serviceIds: z.array(z.string()).optional(),
});

const companyInclude = {
  parent: { select: { id: true, name: true, type: true } },
  services: { orderBy: { name: "asc" as const } },
} as const;

const companyDetailInclude = {
  parent: { select: { id: true, name: true, type: true } },
  children: { select: { id: true, name: true, type: true, isActive: true }, orderBy: { name: "asc" as const } },
  services: { orderBy: { name: "asc" as const } },
  users: {
    select: { id: true, name: true, email: true, role: true, isActive: true, managerId: true, service: { select: { id: true, name: true } } },
    orderBy: { name: "asc" as const },
  },
  _count: { select: { users: true } },
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
  // Le placeholder « Société supprimée » reste inclus : c'est là que retrouver les utilisateurs,
  // matériels et licences réaffectés suite à la suppression d'une société.
  const companies = await prisma.company.findMany({
    include: companyInclude,
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
  res.json({ companies });
}

export async function getCompany(req: Request, res: Response) {
  const company = await prisma.company.findUnique({
    where: { id: req.params.id },
    include: companyDetailInclude,
  });
  if (!company) throw new HttpError(404, "Société introuvable");
  res.json({ company });
}

export async function createCompany(req: Request, res: Response) {
  const { serviceIds, ...data } = companySchema.parse(req.body);
  const existing = await prisma.company.findUnique({ where: { name: data.name } });
  if (existing) throw new HttpError(409, "Cette société existe déjà");

  if (data.parentId) {
    const parent = await prisma.company.findUnique({ where: { id: data.parentId } });
    if (!parent) throw new HttpError(400, "Société parente invalide");
  }

  const company = await prisma.company.create({
    data: { ...data, services: serviceIds ? { connect: serviceIds.map((id) => ({ id })) } : undefined },
    include: companyInclude,
  });
  res.status(201).json({ company });
}

export async function updateCompany(req: Request, res: Response) {
  const { serviceIds, ...data } = companySchema.partial().parse(req.body);
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
    data: { ...data, services: serviceIds ? { set: serviceIds.map((id) => ({ id })) } : undefined },
    include: companyInclude,
  });
  res.json({ company: updated });
}

export async function deleteCompany(req: Request, res: Response) {
  const company = await prisma.company.findUnique({ where: { id: req.params.id } });
  if (!company) throw new HttpError(404, "Société introuvable");

  if (company.isSystemPlaceholder) {
    throw new HttpError(400, "Cette société système ne peut pas être supprimée");
  }

  const deletedCompanyId = await getDeletedCompanyId();

  await prisma.$transaction(async (tx) => {
    await tx.asset.updateMany({ where: { companyId: company.id }, data: { companyId: deletedCompanyId } });
    await tx.license.updateMany({ where: { companyId: company.id }, data: { companyId: deletedCompanyId } });
    // Les utilisateurs de cette société sont rattachés à la société générique plutôt que bloquer la
    // suppression ; un administrateur pourra ensuite les réaffecter à une société réelle.
    await tx.user.updateMany({ where: { companyId: company.id }, data: { companyId: deletedCompanyId } });
    // Les filiales de cette société deviennent des sociétés de premier niveau (parentId nul).
    await tx.company.updateMany({ where: { parentId: company.id }, data: { parentId: null } });

    await tx.company.delete({ where: { id: company.id } });
  });

  res.status(204).send();
}
