import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { HttpError } from "../middleware/errorHandler";
import { hashPassword } from "../utils/password";
import { generatePassword } from "../utils/generatePassword";
import { sendMail } from "../services/email.service";

const optionalText = () =>
  z
    .string()
    .max(120)
    .nullable()
    .optional()
    .transform((v) => (v ? v.trim() || null : null));

const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  role: z.enum(["ADMIN", "AGENT", "USER"]).default("USER"),
  companyId: z.string().min(1, "La société est requise"),
  serviceId: z.string().nullable().optional(),
  managerId: z.string().nullable().optional(),
  isDepartmentHead: z.boolean().optional(),
  matricule: optionalText(),
  phone: optionalText(),
  pcName: optionalText(),
  anydeskId: optionalText(),
  teamviewerId: optionalText(),
  ultraviewerId: optionalText(),
});

const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  role: z.enum(["ADMIN", "AGENT", "USER"]).optional(),
  isActive: z.boolean().optional(),
  serviceId: z.string().nullable().optional(),
  managerId: z.string().nullable().optional(),
  companyId: z.string().optional(),
  isDepartmentHead: z.boolean().optional(),
  matricule: optionalText(),
  phone: optionalText(),
  pcName: optionalText(),
  anydeskId: optionalText(),
  teamviewerId: optionalText(),
  ultraviewerId: optionalText(),
});

const publicSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  service: { select: { id: true, name: true } },
  manager: { select: { id: true, name: true } },
  isActive: true,
  isDepartmentHead: true,
  createdAt: true,
  company: true,
  matricule: true,
  phone: true,
  pcName: true,
  anydeskId: true,
  teamviewerId: true,
  ultraviewerId: true,
} as const;

async function wouldCreateManagerCycle(userId: string, newManagerId: string): Promise<boolean> {
  let current: string | null = newManagerId;
  const seen = new Set<string>();
  while (current) {
    if (current === userId) return true;
    if (seen.has(current)) break;
    seen.add(current);
    const manager: { managerId: string | null } | null = await prisma.user.findUnique({
      where: { id: current },
      select: { managerId: true },
    });
    current = manager?.managerId ?? null;
  }
  return false;
}

async function assertServiceBelongsToCompany(serviceId: string, companyId: string) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { services: { where: { id: serviceId }, select: { id: true } } },
  });
  if (!company || company.services.length === 0) {
    throw new HttpError(400, "Ce service n'est pas activé pour cette société");
  }
}

export async function listUsers(req: Request, res: Response) {
  const { companyId } = req.query as { companyId?: string };
  const users = await prisma.user.findMany({
    where: companyId ? { companyId } : undefined,
    select: publicSelect,
    orderBy: { name: "asc" },
  });
  res.json({ users });
}

export async function getUser(req: Request, res: Response) {
  const user = await prisma.user.findUnique({ where: { id: req.params.id }, select: publicSelect });
  if (!user) throw new HttpError(404, "Utilisateur introuvable");
  res.json({ user });
}

export async function listAgents(_req: Request, res: Response) {
  const agents = await prisma.user.findMany({
    where: { role: { in: ["AGENT", "ADMIN"] }, isActive: true },
    select: publicSelect,
    orderBy: { name: "asc" },
  });
  res.json({ agents });
}

export async function createUser(req: Request, res: Response) {
  const data = createUserSchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new HttpError(409, "Un compte existe déjà avec cet email");

  const company = await prisma.company.findUnique({ where: { id: data.companyId } });
  if (!company || !company.isActive) throw new HttpError(400, "Société invalide");

  if (data.serviceId) {
    await assertServiceBelongsToCompany(data.serviceId, data.companyId);
  }

  if (data.managerId) {
    const manager = await prisma.user.findUnique({ where: { id: data.managerId } });
    if (!manager || manager.companyId !== data.companyId) {
      throw new HttpError(400, "Le supérieur hiérarchique doit appartenir à la même société");
    }
  }

  const generatedPassword = generatePassword();
  const passwordHash = await hashPassword(generatedPassword);
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role,
      companyId: data.companyId,
      serviceId: data.serviceId || null,
      managerId: data.managerId || null,
      isDepartmentHead: data.isDepartmentHead ?? false,
      matricule: data.matricule ?? null,
      phone: data.phone ?? null,
      pcName: data.pcName ?? null,
      anydeskId: data.anydeskId ?? null,
      teamviewerId: data.teamviewerId ?? null,
      ultraviewerId: data.ultraviewerId ?? null,
    },
    select: publicSelect,
  });

  await sendMail({
    to: user.email,
    subject: "Votre compte ITicket a été créé",
    text: `Bonjour ${user.name},\n\nVotre compte ITicket a été créé.\n\nEmail : ${user.email}\nMot de passe temporaire : ${generatedPassword}\n\nVous pouvez le modifier à tout moment depuis « Mon compte » une fois connecté.\n\nL'équipe IT Meninx Holding`,
  });

  res.status(201).json({ user, generatedPassword });
}

export async function updateUser(req: Request, res: Response) {
  const data = updateUserSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) throw new HttpError(404, "Utilisateur introuvable");

  const targetCompanyId = data.companyId ?? user.companyId;

  if (data.companyId) {
    const company = await prisma.company.findUnique({ where: { id: data.companyId } });
    if (!company) throw new HttpError(400, "Société invalide");
  }

  if (data.email && data.email !== user.email) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new HttpError(409, "Un compte existe déjà avec cet email");
  }

  if (data.serviceId) {
    await assertServiceBelongsToCompany(data.serviceId, targetCompanyId);
  }

  if (data.managerId) {
    if (data.managerId === user.id) {
      throw new HttpError(400, "Un utilisateur ne peut pas être son propre supérieur hiérarchique");
    }
    const manager = await prisma.user.findUnique({ where: { id: data.managerId } });
    if (!manager || manager.companyId !== targetCompanyId) {
      throw new HttpError(400, "Le supérieur hiérarchique doit appartenir à la même société");
    }
    if (await wouldCreateManagerCycle(user.id, data.managerId)) {
      throw new HttpError(400, "Ce supérieur hiérarchique créerait une hiérarchie circulaire");
    }
  }

  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: {
      ...data,
      serviceId: data.serviceId === undefined ? undefined : data.serviceId || null,
      managerId: data.managerId === undefined ? undefined : data.managerId || null,
    },
    select: publicSelect,
  });
  res.json({ user: updated });
}

export async function deleteUser(req: Request, res: Response) {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) throw new HttpError(404, "Utilisateur introuvable");

  if (req.user!.id === user.id) {
    throw new HttpError(400, "Vous ne pouvez pas supprimer votre propre compte");
  }

  try {
    await prisma.user.delete({ where: { id: req.params.id } });
  } catch {
    throw new HttpError(
      409,
      "Impossible de supprimer cet utilisateur : des tickets, du matériel ou d'autres éléments lui sont liés. Désactivez son compte à la place."
    );
  }

  res.status(204).send();
}

export async function resetUserPassword(req: Request, res: Response) {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) throw new HttpError(404, "Utilisateur introuvable");

  const generatedPassword = generatePassword();
  const passwordHash = await hashPassword(generatedPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  await sendMail({
    to: user.email,
    subject: "Votre mot de passe ITicket a été réinitialisé",
    text: `Bonjour ${user.name},\n\nVotre mot de passe ITicket a été réinitialisé par un administrateur.\n\nEmail : ${user.email}\nNouveau mot de passe temporaire : ${generatedPassword}\n\nVous pouvez le modifier à tout moment depuis « Mon compte » une fois connecté.\n\nL'équipe IT Meninx Holding`,
  });

  res.json({ generatedPassword });
}

export async function listRemoteAccess(_req: Request, res: Response) {
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      OR: [{ anydeskId: { not: null } }, { teamviewerId: { not: null } }, { ultraviewerId: { not: null } }],
    },
    select: {
      id: true,
      name: true,
      email: true,
      pcName: true,
      anydeskId: true,
      teamviewerId: true,
      ultraviewerId: true,
      company: { select: { id: true, name: true } },
      service: { select: { id: true, name: true } },
    },
    orderBy: { name: "asc" },
  });
  res.json({ users });
}
