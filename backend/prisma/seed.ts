import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const priorities = [
    { name: "Basse", level: 1, color: "#22c55e", responseTimeHours: 24, resolutionTimeHours: 120 },
    { name: "Moyenne", level: 2, color: "#eab308", responseTimeHours: 8, resolutionTimeHours: 48 },
    { name: "Haute", level: 3, color: "#f97316", responseTimeHours: 4, resolutionTimeHours: 24 },
    { name: "Critique", level: 4, color: "#ef4444", responseTimeHours: 1, resolutionTimeHours: 8 },
  ];
  for (const priority of priorities) {
    await prisma.priority.upsert({ where: { name: priority.name }, update: {}, create: priority });
  }

  const categories = [
    { name: "Matériel", description: "Panne ou demande liée au matériel informatique (PC, imprimante, périphériques)" },
    { name: "Logiciel", description: "Installation, bug ou demande liée à un logiciel" },
    { name: "Réseau", description: "Problème de connexion réseau, VPN, Wi-Fi" },
    { name: "Compte & Accès", description: "Création de compte, réinitialisation de mot de passe, droits d'accès" },
    { name: "Téléphonie", description: "Demandes liées à la téléphonie fixe ou mobile" },
    { name: "Autre", description: "Toute autre demande d'intervention IT" },
  ];
  for (const category of categories) {
    await prisma.category.upsert({ where: { name: category.name }, update: {}, create: category });
  }

  const companies = [
    { name: "Meninx Holding", type: "HOLDING" as const },
    { name: "Meninx Industrie", type: "FILIALE" as const },
    { name: "Meninx Logistique", type: "FILIALE" as const },
  ];
  for (const company of companies) {
    await prisma.company.upsert({ where: { name: company.name }, update: {}, create: company });
  }
  const holding = await prisma.company.findUniqueOrThrow({ where: { name: "Meninx Holding" } });
  const filiale = await prisma.company.findUniqueOrThrow({ where: { name: "Meninx Industrie" } });

  const passwordHash = await bcrypt.hash("Password123!", 10);

  await prisma.user.upsert({
    where: { email: "admin@societe.local" },
    update: {},
    create: {
      name: "Admin IT",
      email: "admin@societe.local",
      passwordHash,
      role: "ADMIN",
      companyId: holding.id,
      service: "IT",
    },
  });

  await prisma.user.upsert({
    where: { email: "agent@societe.local" },
    update: {},
    create: {
      name: "Agent Support",
      email: "agent@societe.local",
      passwordHash,
      role: "AGENT",
      companyId: holding.id,
      service: "IT",
    },
  });

  await prisma.user.upsert({
    where: { email: "user@societe.local" },
    update: {},
    create: {
      name: "Utilisateur Test",
      email: "user@societe.local",
      passwordHash,
      role: "USER",
      companyId: filiale.id,
      service: "Ventes",
    },
  });

  console.log("Seed terminé. Comptes créés (mot de passe : Password123!) :");
  console.log(" - admin@societe.local (ADMIN, Meninx Holding)");
  console.log(" - agent@societe.local (AGENT, Meninx Holding)");
  console.log(" - user@societe.local (USER, Meninx Industrie)");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
