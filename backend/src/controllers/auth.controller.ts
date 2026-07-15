import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { comparePassword } from "../utils/password";
import { signToken } from "../utils/jwt";
import { HttpError } from "../middleware/errorHandler";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const userInclude = { company: true, service: true } as const;

function toPublicUser(user: {
  id: string;
  name: string;
  email: string;
  role: string;
  service: { id: string; name: string } | null;
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
