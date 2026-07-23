import type { NextFunction, Request, Response } from "express";
import type { Role } from "@prisma/client";
import { verifyToken } from "../utils/jwt";
import { prisma } from "../config/prisma";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: Role };
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentification requise" });
  }

  const token = header.slice("Bearer ".length);
  try {
    const payload = verifyToken(token);
    // Le rôle (et l'activation) vient toujours de la base, jamais du JWT :
    // un changement de rôle ou une désactivation doit s'appliquer immédiatement,
    // pas seulement à la prochaine connexion (le token reste valable plusieurs jours).
    const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, role: true, isActive: true } });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: "Token invalide ou expiré" });
    }
    req.user = { id: user.id, role: user.role };
    next();
  } catch {
    return res.status(401).json({ error: "Token invalide ou expiré" });
  }
}

export function authorize(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentification requise" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Accès refusé" });
    }
    next();
  };
}
