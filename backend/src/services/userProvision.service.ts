import crypto from "crypto";
import { prisma } from "../config/prisma";
import { hashPassword } from "../utils/password";

const FALLBACK_COMPANY_NAME = "Non renseigné";
const FALLBACK_SERVICE = "Non renseigné";

async function resolveFallbackCompanyId(): Promise<string> {
  const existing = await prisma.company.findUnique({ where: { name: FALLBACK_COMPANY_NAME } });
  if (existing) return existing.id;

  const created = await prisma.company.create({
    data: { name: FALLBACK_COMPANY_NAME, type: "FILIALE", isActive: false },
  });
  return created.id;
}

export async function ensureUserByEmail(
  email: string,
  name: string
): Promise<{ id: string; email: string; name: string }> {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;

  const randomPassword = crypto.randomBytes(24).toString("hex");
  const passwordHash = await hashPassword(randomPassword);
  const companyId = await resolveFallbackCompanyId();

  return prisma.user.create({
    data: { name, email, passwordHash, role: "USER", companyId, service: FALLBACK_SERVICE },
  });
}
