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

  const ticketTypes = [
    { name: "Incident", description: "Un service ou un équipement ne fonctionne pas comme prévu" },
    { name: "Demande de service", description: "Demande standard : accès, matériel, information, changement mineur" },
    { name: "Problème", description: "Cause récurrente ou sous-jacente à plusieurs incidents" },
    { name: "Changement", description: "Demande de modification planifiée d'un système ou service" },
  ];
  for (const type of ticketTypes) {
    await prisma.ticketType.upsert({ where: { name: type.name }, update: {}, create: type });
  }

  const categories = [
    {
      name: "Matériel",
      description: "Panne ou demande liée au matériel informatique (PC, imprimante, périphériques)",
      subCategories: ["Ordinateur portable", "Ordinateur de bureau", "Imprimante / Scanner", "Écran / Périphérique", "Autre matériel"],
    },
    {
      name: "Logiciel",
      description: "Installation, bug ou demande liée à un logiciel",
      subCategories: ["Installation logicielle", "Bug / Dysfonctionnement", "Mise à jour", "Licence logicielle", "Autre logiciel"],
    },
    {
      name: "Réseau",
      description: "Problème de connexion réseau, VPN, Wi-Fi",
      subCategories: ["Wi-Fi", "VPN", "Réseau local (LAN)", "Accès Internet", "Autre réseau"],
    },
    {
      name: "Compte & Accès",
      description: "Création de compte, réinitialisation de mot de passe, droits d'accès",
      subCategories: ["Création de compte", "Réinitialisation de mot de passe", "Modification des droits d'accès", "Désactivation de compte"],
    },
    {
      name: "Téléphonie",
      description: "Demandes liées à la téléphonie fixe ou mobile",
      subCategories: ["Téléphone fixe", "Mobile professionnel", "Ligne / Standard téléphonique"],
    },
    {
      name: "Autre",
      description: "Toute autre demande d'intervention IT",
      subCategories: ["Autre demande"],
    },
  ];
  for (const category of categories) {
    const created = await prisma.category.upsert({
      where: { name: category.name },
      update: {},
      create: { name: category.name, description: category.description },
    });
    for (const subName of category.subCategories) {
      await prisma.subCategory.upsert({
        where: { categoryId_name: { categoryId: created.id, name: subName } },
        update: {},
        create: { name: subName, categoryId: created.id },
      });
    }
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
