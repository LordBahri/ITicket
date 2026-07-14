import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { hashPassword, comparePassword } from "../utils/password";
import { signToken } from "../utils/jwt";
import { HttpError } from "../middleware/errorHandler";

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  companyId: z.string().min(1, "La société est requise"),
  service: z.string().min(2).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const userInclude = { company: true } as const;

function toPublicUser(user: {
  id: string;
  name: string;
  email: string;
  role: string;
  service: string;
  isActive: boolean;
  company: { id: string; name: string; type: string };
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    service: user.service,
    isActive: user.isActive,
    company: user.company,
  };
}

export async function register(req: Request, res: Response) {
  const data = registerSchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw new HttpError(409, "Un compte existe déjà avec cet email");
  }

  const company = await prisma.company.findUnique({ where: { id: data.companyId } });
  if (!company || !company.isActive) {
    throw new HttpError(400, "Société invalide");
  }

  const passwordHash = await hashPassword(data.password);
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      companyId: data.companyId,
      service: data.service,
      role: "USER",
    },
    include: userInclude,
  });

  const token = signToken({ sub: user.id, role: user.role });
  res.status(201).json({ token, user: toPublicUser(user) });
}

export async function login(req: Request, res: Response) {
  const data = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email: data.email }, include: userInclude });
  if (!user || !user.isActive) {
    throw new HttpError(401, "Identifiants invalides");
  }

  const valid = await comparePassword(data.password, user.passwordHash);
  if (!valid) {
    throw new HttpError(401, "Identifiants invalides");
  }

  const token = signToken({ sub: user.id, role: user.role });
  res.json({ token, user: toPublicUser(user) });
}

export async function me(req: Request, res: Response) {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id }, include: userInclude });
  if (!user) {
    throw new HttpError(404, "Utilisateur introuvable");
  }
  res.json({ user: toPublicUser(user) });
}
