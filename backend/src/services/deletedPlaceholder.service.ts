import crypto from "crypto";
import { prisma } from "../config/prisma";
import { hashPassword } from "../utils/password";

const DELETED_COMPANY_NAME = "Société supprimée";
const DELETED_USER_EMAIL = "utilisateur.supprime@iticket.local";
const DELETED_USER_NAME = "Utilisateur supprimé";

export async function getDeletedCompanyId(): Promise<string> {
  const company = await prisma.company.upsert({
    where: { name: DELETED_COMPANY_NAME },
    update: {},
    create: { name: DELETED_COMPANY_NAME, type: "FILIALE", isActive: false, isSystemPlaceholder: true },
  });
  return company.id;
}

export async function getDeletedUserId(): Promise<string> {
  const existing = await prisma.user.findUnique({ where: { email: DELETED_USER_EMAIL } });
  if (existing) return existing.id;

  const companyId = await getDeletedCompanyId();
  const passwordHash = await hashPassword(crypto.randomBytes(32).toString("hex"));
  const user = await prisma.user.create({
    data: {
      name: DELETED_USER_NAME,
      email: DELETED_USER_EMAIL,
      passwordHash,
      role: "USER",
      isActive: false,
      isSystemPlaceholder: true,
      companyId,
    },
  });
  return user.id;
}
