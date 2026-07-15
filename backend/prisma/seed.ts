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

  const serviceNames = [
    "Direction générale",
    "IT",
    "RH",
    "Comptabilité & Finance",
    "Ventes",
    "Marketing",
    "Production",
    "Logistique",
    "Achats",
    "Juridique",
  ];
  const services = new Map<string, { id: string }>();
  for (const name of serviceNames) {
    const s = await prisma.service.upsert({ where: { name }, update: {}, create: { name } });
    services.set(name, s);
  }

  const assetTypeNames = [
    "Ordinateur portable",
    "Ordinateur de bureau",
    "Écran",
    "Imprimante / Scanner",
    "Téléphone mobile",
    "Serveur",
    "Switch réseau",
    "Onduleur (UPS)",
    "Point d'accès Wi-Fi",
    "Autre",
  ];
  for (const name of assetTypeNames) {
    await prisma.assetType.upsert({ where: { name }, update: {}, create: { name } });
  }

  const processes = [
    {
      name: "Remplacement de matériel",
      category: "CHANGE_ENABLEMENT" as const,
      description: "Remplacement planifié d'un équipement (PC, périphérique...) — traité comme un changement standard ITIL.",
      requiresManagerApproval: true,
      requiresPhysicalForm: true,
      formTemplateUrl: "/forms/formulaire-engagement-equipements.docx",
      steps: [
        "Vérifier l'état du matériel actuel et le motif du remplacement",
        "Valider le budget de remplacement",
        "Commander / préparer le nouveau matériel",
        "Configurer et transférer les données",
        "Faire signer le formulaire d'engagement des équipements",
        "Récupérer l'ancien matériel",
        "Mettre à jour l'inventaire (fiche société / utilisateur)",
      ],
    },
    {
      name: "Préparation de poste — Nouvel employé",
      category: "ONBOARDING" as const,
      description: "Préparation complète de l'environnement de travail IT d'un nouvel employé (matériel, comptes, accès, licences).",
      requiresManagerApproval: true,
      requiresPhysicalForm: true,
      formTemplateUrl: "/forms/formulaire-preparation-poste-nouvel-employe.docx",
      steps: [
        "Achat / attribution du PC et des périphériques",
        "Création du compte Active Directory",
        "Création de la boîte email professionnelle",
        "Création du compte VPN OpenVPN",
        "Création des accès Sage / ERP",
        "Attribution des licences logicielles nécessaires",
        "Faire signer le formulaire d'engagement et d'accès",
        "Remise physique du matériel et du badge",
      ],
    },
    {
      name: "Départ collaborateur — Offboarding IT",
      category: "OFFBOARDING" as const,
      description: "Restitution du matériel et désactivation de l'ensemble des accès lors du départ d'un collaborateur.",
      requiresManagerApproval: true,
      requiresPhysicalForm: true,
      formTemplateUrl: "/forms/formulaire-restitution-materiel-depart.docx",
      steps: [
        "Restitution du matériel (PC, téléphone, accessoires)",
        "Désactivation du compte Active Directory",
        "Désactivation de la boîte email",
        "Désactivation du compte VPN",
        "Désactivation des accès Sage / ERP",
        "Révocation des licences logicielles",
        "Faire signer le formulaire de restitution",
        "Archiver le formulaire signé",
      ],
    },
    {
      name: "Acquisition de licence logicielle",
      category: "ASSET_MANAGEMENT" as const,
      description: "Achat d'une nouvelle licence logicielle — Software Asset Management.",
      requiresManagerApproval: true,
      requiresPhysicalForm: true,
      formTemplateUrl: "/forms/formulaire-demande-acquisition-licence.docx",
      steps: [
        "Identifier le besoin et le nombre de postes",
        "Obtenir un devis fournisseur",
        "Faire valider le budget par le responsable",
        "Commander la licence",
        "Enregistrer la licence dans l'inventaire (module Licences)",
        "Faire signer le formulaire de demande",
        "Archiver le formulaire signé",
      ],
    },
    {
      name: "Demande d'accès applicatif",
      category: "ACCESS_MANAGEMENT" as const,
      description: "Création, modification ou révocation d'un accès applicatif (AD, Email, VPN, ERP/Sage) hors onboarding/offboarding.",
      requiresManagerApproval: true,
      requiresPhysicalForm: true,
      formTemplateUrl: "/forms/formulaire-demande-acces-applicatif.docx",
      steps: [
        "Vérifier l'habilitation demandée avec le responsable",
        "Créer / modifier les accès (AD, Email, VPN, ERP)",
        "Tester les accès avec l'utilisateur",
        "Faire signer le formulaire de demande d'accès",
        "Archiver le formulaire signé",
      ],
    },
  ];
  for (const process of processes) {
    const created = await prisma.process.upsert({
      where: { name: process.name },
      update: {},
      create: {
        name: process.name,
        category: process.category,
        description: process.description,
        requiresManagerApproval: process.requiresManagerApproval,
        requiresPhysicalForm: process.requiresPhysicalForm,
        formTemplateUrl: process.formTemplateUrl,
      },
    });
    for (const [index, stepName] of process.steps.entries()) {
      const existingStep = await prisma.processStep.findFirst({ where: { processId: created.id, name: stepName } });
      if (!existingStep) {
        await prisma.processStep.create({ data: { processId: created.id, name: stepName, order: index } });
      }
    }
  }

  const companies = [
    { name: "Meninx Holding", type: "HOLDING" as const, services: ["Direction générale", "IT", "RH", "Comptabilité & Finance", "Juridique"] },
    { name: "Meninx Industrie", type: "FILIALE" as const, services: ["IT", "Production", "Achats", "Ventes", "Logistique"] },
    { name: "Meninx Logistique", type: "FILIALE" as const, services: ["IT", "Logistique", "Achats", "Ventes"] },
  ];
  for (const company of companies) {
    await prisma.company.upsert({
      where: { name: company.name },
      update: { services: { set: company.services.map((s) => ({ id: services.get(s)!.id })) } },
      create: {
        name: company.name,
        type: company.type,
        services: { connect: company.services.map((s) => ({ id: services.get(s)!.id })) },
      },
    });
  }
  const holding = await prisma.company.findUniqueOrThrow({ where: { name: "Meninx Holding" } });
  const filiale = await prisma.company.findUniqueOrThrow({ where: { name: "Meninx Industrie" } });

  const passwordHash = await bcrypt.hash("Password123!", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@societe.local" },
    update: {},
    create: {
      name: "Admin IT",
      email: "admin@societe.local",
      passwordHash,
      role: "ADMIN",
      companyId: holding.id,
      serviceId: services.get("IT")!.id,
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
      serviceId: services.get("IT")!.id,
      managerId: admin.id,
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
      serviceId: services.get("Ventes")!.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "responsable@societe.local" },
    update: {},
    create: {
      name: "Responsable Ventes",
      email: "responsable@societe.local",
      passwordHash,
      role: "USER",
      companyId: filiale.id,
      serviceId: services.get("Ventes")!.id,
      isDepartmentHead: true,
      managerId: admin.id,
    },
  });

  console.log("Seed terminé. Comptes créés (mot de passe : Password123!) :");
  console.log(" - admin@societe.local (ADMIN, Meninx Holding)");
  console.log(" - agent@societe.local (AGENT, Meninx Holding)");
  console.log(" - user@societe.local (USER, Meninx Industrie)");
  console.log(" - responsable@societe.local (USER, responsable de service, Meninx Industrie — peut lancer des demandes de processus IT)");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
