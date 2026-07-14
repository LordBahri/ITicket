import crypto from "crypto";
import { prisma } from "../config/prisma";
import { hashPassword } from "../utils/password";

export async function ensureUserByEmail(email: string, name: string): Promise<{ id: string; email: string; name: string }> {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;

  const randomPassword = crypto.randomBytes(24).toString("hex");
  const passwordHash = await hashPassword(randomPassword);

  return prisma.user.create({
    data: { name, email, passwordHash, role: "USER" },
  });
}
