import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { HttpError } from "../middleware/errorHandler";

const licenseSchema = z.object({
  name: z.string().min(2).max(150),
  vendor: z.string().max(150).nullable().optional(),
  licenseKey: z.string().max(500).nullable().optional(),
  seats: z.number().int().min(1).max(100000).optional(),
  startDate: z.coerce.date().nullable().optional(),
  expiryDate: z.coerce.date(),
  notes: z.string().max(2000).nullable().optional(),
  companyId: z.string().nullable().optional(),
});

const licenseInclude = {
  company: { select: { id: true, name: true } },
} as const;

export async function listLicenses(req: Request, res: Response) {
  const { companyId } = req.query as { companyId?: string };
  const licenses = await prisma.license.findMany({
    where: { companyId: companyId || undefined },
    include: licenseInclude,
    orderBy: { expiryDate: "asc" },
  });
  res.json({ licenses });
}

export async function getLicense(req: Request, res: Response) {
  const license = await prisma.license.findUnique({ where: { id: req.params.id }, include: licenseInclude });
  if (!license) throw new HttpError(404, "Licence introuvable");
  res.json({ license });
}

export async function createLicense(req: Request, res: Response) {
  const data = licenseSchema.parse(req.body);

  if (data.companyId) {
    const company = await prisma.company.findUnique({ where: { id: data.companyId } });
    if (!company) throw new HttpError(400, "Société invalide");
  }

  const license = await prisma.license.create({ data, include: licenseInclude });
  res.status(201).json({ license });
}

export async function updateLicense(req: Request, res: Response) {
  const data = licenseSchema.partial().parse(req.body);
  const license = await prisma.license.findUnique({ where: { id: req.params.id } });
  if (!license) throw new HttpError(404, "Licence introuvable");

  if (data.companyId) {
    const company = await prisma.company.findUnique({ where: { id: data.companyId } });
    if (!company) throw new HttpError(400, "Société invalide");
  }

  const expiryChanged = data.expiryDate && data.expiryDate.getTime() !== license.expiryDate.getTime();

  const updated = await prisma.license.update({
    where: { id: req.params.id },
    data: {
      ...data,
      ...(expiryChanged ? { reminder30Sent: false, reminder7Sent: false, reminder1Sent: false } : {}),
    },
    include: licenseInclude,
  });
  res.json({ license: updated });
}
