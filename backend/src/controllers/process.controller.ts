import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { HttpError } from "../middleware/errorHandler";

const PROCESS_CATEGORIES = [
  "CHANGE_ENABLEMENT",
  "REQUEST_FULFILLMENT",
  "ACCESS_MANAGEMENT",
  "ASSET_MANAGEMENT",
  "ONBOARDING",
  "OFFBOARDING",
] as const;

const processSchema = z.object({
  name: z.string().min(2).max(150),
  category: z.enum(PROCESS_CATEGORIES),
  description: z.string().max(1000).nullable().optional(),
  requiresManagerApproval: z.boolean().optional(),
  requiresPhysicalForm: z.boolean().optional(),
  formTemplateUrl: z.string().max(300).nullable().optional(),
  isActive: z.boolean().optional(),
  openToAllUsers: z.boolean().optional(),
  typeId: z.string(),
  categoryId: z.string(),
  subCategoryId: z.string(),
});

const processStepSchema = z.object({
  name: z.string().min(2).max(200),
  order: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

const processInclude = {
  steps: { orderBy: { order: "asc" as const } },
  ticketType: { select: { id: true, name: true } },
  ticketCategory: { select: { id: true, name: true } },
  subCategory: { select: { id: true, name: true } },
} as const;

async function assertTypeCategorySubCategoryConsistent(typeId: string, categoryId: string, subCategoryId: string) {
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category || category.ticketTypeId !== typeId) throw new HttpError(400, "Catégorie invalide pour ce type de demande");

  const subCategory = await prisma.subCategory.findUnique({ where: { id: subCategoryId } });
  if (!subCategory || subCategory.categoryId !== categoryId) throw new HttpError(400, "Sous-catégorie invalide pour cette catégorie");
}

export async function listProcesses(_req: Request, res: Response) {
  const processes = await prisma.process.findMany({
    include: processInclude,
    orderBy: { name: "asc" },
  });
  res.json({ processes });
}

export async function getProcess(req: Request, res: Response) {
  const process = await prisma.process.findUnique({ where: { id: req.params.id }, include: processInclude });
  if (!process) throw new HttpError(404, "Processus introuvable");
  res.json({ process });
}

export async function createProcess(req: Request, res: Response) {
  const data = processSchema.parse(req.body);
  const existing = await prisma.process.findUnique({ where: { name: data.name } });
  if (existing) throw new HttpError(409, "Ce processus existe déjà");

  const ticketType = await prisma.ticketType.findUnique({ where: { id: data.typeId } });
  if (!ticketType) throw new HttpError(400, "Type de demande invalide");
  await assertTypeCategorySubCategoryConsistent(data.typeId, data.categoryId, data.subCategoryId);

  const process = await prisma.process.create({ data, include: processInclude });
  res.status(201).json({ process });
}

export async function updateProcess(req: Request, res: Response) {
  const data = processSchema.partial().parse(req.body);
  const process = await prisma.process.findUnique({ where: { id: req.params.id } });
  if (!process) throw new HttpError(404, "Processus introuvable");

  const effectiveTypeId = data.typeId ?? process.typeId;
  const effectiveCategoryId = data.categoryId ?? process.categoryId;
  const effectiveSubCategoryId = data.subCategoryId ?? process.subCategoryId;
  if (data.typeId || data.categoryId || data.subCategoryId) {
    if (data.typeId) {
      const ticketType = await prisma.ticketType.findUnique({ where: { id: data.typeId } });
      if (!ticketType) throw new HttpError(400, "Type de demande invalide");
    }
    await assertTypeCategorySubCategoryConsistent(effectiveTypeId, effectiveCategoryId, effectiveSubCategoryId);
  }

  const updated = await prisma.process.update({ where: { id: req.params.id }, data, include: processInclude });
  res.json({ process: updated });
}

export async function createProcessStep(req: Request, res: Response) {
  const data = processStepSchema.parse(req.body);
  const process = await prisma.process.findUnique({ where: { id: req.params.id } });
  if (!process) throw new HttpError(404, "Processus introuvable");

  const step = await prisma.processStep.create({
    data: { ...data, processId: process.id },
  });
  res.status(201).json({ step });
}

export async function updateProcessStep(req: Request, res: Response) {
  const data = processStepSchema.partial().parse(req.body);
  const step = await prisma.processStep.findUnique({ where: { id: req.params.stepId } });
  if (!step) throw new HttpError(404, "Étape introuvable");

  const updated = await prisma.processStep.update({ where: { id: req.params.stepId }, data });
  res.json({ step: updated });
}
