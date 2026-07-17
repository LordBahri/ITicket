import type { Request, Response } from "express";
import fs from "fs";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { comparePassword, hashPassword } from "../utils/password";
import { signToken } from "../utils/jwt";
import { HttpError } from "../middleware/errorHandler";
import { avatarPath } from "../middleware/avatarUpload";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(100),
});

const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z
    .string()
    .max(40)
    .nullable()
    .optional()
    .transform((v) => (v ? v.trim() || null : null)),
});

const userInclude = { company: true, service: true } as const;

function toPublicUser(user: {
  id: string;
  name: string;
  email: string;
  role: string;
  service: { id: string; name: string } | null;
  isActive: boolean;
  isDepartmentHead: boolean;
  company: { id: string; name: string; type: string };
  phone: string | null;
  avatarUrl: string | null;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    service: user.service,
    isActive: user.isActive,
    isDepartmentHead: user.isDepartmentHead,
    company: user.company,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
  };
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

export async function changePassword(req: Request, res: Response) {
  const data = changePasswordSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) throw new HttpError(404, "Utilisateur introuvable");

  const valid = await comparePassword(data.currentPassword, user.passwordHash);
  if (!valid) throw new HttpError(400, "Mot de passe actuel incorrect");

  const passwordHash = await hashPassword(data.newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  res.status(204).send();
}

export async function updateProfile(req: Request, res: Response) {
  const data = updateProfileSchema.parse(req.body);

  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data,
    include: userInclude,
  });

  res.json({ user: toPublicUser(user) });
}

export async function uploadMyAvatar(req: Request, res: Response) {
  if (!req.file) throw new HttpError(400, "Aucune image fournie");

  const existing = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (existing?.avatarUrl) {
    const previousFilename = existing.avatarUrl.split("/").pop();
    if (previousFilename) {
      fs.promises.unlink(avatarPath(previousFilename)).catch(() => undefined);
    }
  }

  const avatarUrl = `/uploads/avatars/${req.file.filename}`;
  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: { avatarUrl },
    include: userInclude,
  });

  res.json({ user: toPublicUser(user) });
}

export async function deleteMyAvatar(req: Request, res: Response) {
  const existing = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (existing?.avatarUrl) {
    const previousFilename = existing.avatarUrl.split("/").pop();
    if (previousFilename) {
      fs.promises.unlink(avatarPath(previousFilename)).catch(() => undefined);
    }
  }

  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: { avatarUrl: null },
    include: userInclude,
  });

  res.json({ user: toPublicUser(user) });
}
