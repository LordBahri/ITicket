import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { HttpError } from "../middleware/errorHandler";

const ASSET_STATUSES = ["EN_SERVICE", "EN_STOCK", "EN_MAINTENANCE", "RETIRE"] as const;

const assetBaseSchema = z.object({
  name: z.string().min(2).max(150),
  assetTypeId: z.string().min(1, "Le type de matériel est requis"),
  serialNumber: z.string().max(100).nullable().optional(),
  model: z.string().max(150).nullable().optional(),
  status: z.enum(ASSET_STATUSES).optional(),
  purchaseDate: z.coerce.date().nullable().optional(),
  warrantyEndDate: z.coerce.date().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  companyId: z.string().nullable().optional(),
  assigneeId: z.string().nullable().optional(),
});

const assetSchema = assetBaseSchema.refine((data) => !(data.companyId && data.assigneeId), {
  message: "Un matériel ne peut être affecté qu'à une société OU à un utilisateur, pas les deux",
  path: ["assigneeId"],
});

const assetInclude = {
  assetType: true,
  company: { select: { id: true, name: true } },
  assignee: { select: { id: true, name: true, email: true } },
} as const;

export async function listAssets(req: Request, res: Response) {
  const { companyId, assigneeId, assetTypeId, status } = req.query as {
    companyId?: string;
    assigneeId?: string;
    assetTypeId?: string;
    status?: string;
  };

  const assets = await prisma.asset.findMany({
    where: {
      companyId: companyId || undefined,
      assigneeId: assigneeId || undefined,
      assetTypeId: assetTypeId || undefined,
      status: status && (ASSET_STATUSES as readonly string[]).includes(status) ? (status as (typeof ASSET_STATUSES)[number]) : undefined,
    },
    include: assetInclude,
    orderBy: { createdAt: "desc" },
  });
  res.json({ assets });
}

export async function getAsset(req: Request, res: Response) {
  const asset = await prisma.asset.findUnique({ where: { id: req.params.id }, include: assetInclude });
  if (!asset) throw new HttpError(404, "Matériel introuvable");
  res.json({ asset });
}

async function assertAssignmentValid(companyId?: string | null, assigneeId?: string | null) {
  if (companyId) {
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new HttpError(400, "Société invalide");
  }
  if (assigneeId) {
    const user = await prisma.user.findUnique({ where: { id: assigneeId } });
    if (!user) throw new HttpError(400, "Utilisateur invalide");
  }
}

export async function createAsset(req: Request, res: Response) {
  const data = assetSchema.parse(req.body);

  const assetType = await prisma.assetType.findUnique({ where: { id: data.assetTypeId } });
  if (!assetType) throw new HttpError(400, "Type de matériel invalide");

  await assertAssignmentValid(data.companyId, data.assigneeId);

  if (data.serialNumber) {
    const existing = await prisma.asset.findUnique({ where: { serialNumber: data.serialNumber } });
    if (existing) throw new HttpError(409, "Ce numéro de série est déjà utilisé");
  }

  const asset = await prisma.asset.create({
    data: { ...data, serialNumber: data.serialNumber || null },
    include: assetInclude,
  });
  res.status(201).json({ asset });
}

export async function updateAsset(req: Request, res: Response) {
  const data = assetBaseSchema.partial().parse(req.body);
  const asset = await prisma.asset.findUnique({ where: { id: req.params.id } });
  if (!asset) throw new HttpError(404, "Matériel introuvable");

  const nextCompanyId = data.companyId !== undefined ? data.companyId : asset.companyId;
  const nextAssigneeId = data.assigneeId !== undefined ? data.assigneeId : asset.assigneeId;
  if (nextCompanyId && nextAssigneeId) {
    throw new HttpError(400, "Un matériel ne peut être affecté qu'à une société OU à un utilisateur, pas les deux");
  }

  if (data.assetTypeId) {
    const assetType = await prisma.assetType.findUnique({ where: { id: data.assetTypeId } });
    if (!assetType) throw new HttpError(400, "Type de matériel invalide");
  }

  await assertAssignmentValid(data.companyId, data.assigneeId);

  if (data.serialNumber && data.serialNumber !== asset.serialNumber) {
    const existing = await prisma.asset.findUnique({ where: { serialNumber: data.serialNumber } });
    if (existing) throw new HttpError(409, "Ce numéro de série est déjà utilisé");
  }

  const updated = await prisma.asset.update({
    where: { id: req.params.id },
    data: {
      ...data,
      serialNumber: data.serialNumber === undefined ? undefined : data.serialNumber || null,
    },
    include: assetInclude,
  });
  res.json({ asset: updated });
}
