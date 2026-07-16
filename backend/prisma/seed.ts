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
    "MOA",
    "Contrôle de gestion",
    "Contrôle & audit interne",
    "PMO",
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

  const materiel = await prisma.category.findUniqueOrThrow({ where: { name: "Matériel" } });
  const reseau = await prisma.category.findUniqueOrThrow({ where: { name: "Réseau" } });
  const logiciel = await prisma.category.findUniqueOrThrow({ where: { name: "Logiciel" } });
  const compteAcces = await prisma.category.findUniqueOrThrow({ where: { name: "Compte & Accès" } });

  const guides = [
    {
      title: "Mon imprimante n'imprime plus",
      categoryId: materiel.id,
      content: `![Imprimante non détectée](/kb-images/imprimante.svg)

La plupart des problèmes d'impression se résolvent sans intervention de l'IT. Essayez ces étapes dans l'ordre :

1. **Vérifiez les branchements** : câble USB bien enfoncé des deux côtés, ou imprimante bien connectée au Wi-Fi/réseau.
2. **Vérifiez qu'elle est allumée** et qu'aucun voyant rouge/orange ne clignote (bourrage papier, cartouche vide, bac vide).
3. **Vérifiez le niveau de papier et d'encre/toner.**
4. **Redémarrez l'imprimante** : éteignez-la, attendez 10 secondes, rallumez-la.
5. **Vérifiez la file d'attente d'impression** sur votre PC (Windows : *Paramètres > Imprimantes et scanners* → cliquez sur l'imprimante → *Ouvrir la file d'attente*). Si un document bloque la file, supprimez-le puis relancez l'impression.
6. **Redémarrez votre ordinateur** si le problème persiste.

Si après ces étapes l'imprimante n'imprime toujours pas, ouvrez un ticket (catégorie *Matériel > Imprimante / Scanner*) en précisant le message d'erreur affiché et le modèle de l'imprimante.`,
    },
    {
      title: "Je n'ai plus de connexion Internet ou Wi-Fi",
      categoryId: reseau.id,
      content: `![Pas de Wi-Fi](/kb-images/wifi.svg)

Avant d'ouvrir un ticket, vérifiez les points suivants :

1. **Le Wi-Fi est-il activé** sur votre ordinateur ou téléphone (mode avion désactivé, Wi-Fi allumé) ?
2. **Êtes-vous connecté au bon réseau** ? Vérifiez le nom du réseau (SSID) dans la liste des réseaux disponibles.
3. **Redémarrez votre équipement réseau** si vous êtes chez vous : débranchez la box/le routeur, attendez 30 secondes, rebranchez.
4. **Au bureau**, vérifiez si vos collègues autour de vous ont aussi un problème — cela indique une panne générale déjà connue de l'IT plutôt qu'un problème individuel.
5. **Redémarrez votre appareil** (ordinateur, téléphone).
6. **Testez avec un câble réseau** (Ethernet) si vous en avez un à disposition, pour vérifier si le problème vient du Wi-Fi spécifiquement.

Si la connexion ne revient pas ou si plusieurs personnes sont concernées, ouvrez un ticket (catégorie *Réseau > Wi-Fi* ou *Accès Internet*) en précisant depuis quand et si vous êtes seul(e) concerné(e).`,
    },
    {
      title: "Mon ordinateur est très lent",
      categoryId: materiel.id,
      content: `![PC lent](/kb-images/pc-lent.svg)

Un ordinateur lent n'est pas toujours synonyme de panne. Quelques vérifications simples avant d'ouvrir un ticket :

1. **Combien d'applications et d'onglets avez-vous ouverts ?** Fermez ceux dont vous n'avez pas besoin — chaque application/onglet consomme de la mémoire.
2. **Redémarrez votre ordinateur** (pas seulement une mise en veille) : cela libère la mémoire et applique les mises à jour en attente. C'est souvent suffisant.
3. **Vérifiez l'espace disque disponible** (Windows : *Ce PC* → regardez l'espace libre sur le disque C:). Un disque presque plein ralentit fortement le système.
4. **Laissez les mises à jour se terminer** : une mise à jour Windows ou antivirus en cours peut ralentir temporairement la machine.
5. **Débranchez les périphériques USB non essentiels** (disques externes, clés USB) le temps du diagnostic.

Si la lenteur persiste après un redémarrage complet et qu'elle affecte votre travail au quotidien, ouvrez un ticket (catégorie *Matériel*) en précisant depuis quand et dans quelles situations (au démarrage, sur un logiciel précis, tout le temps…).`,
    },
    {
      title: "Mon écran reste noir / rien ne s'affiche",
      categoryId: materiel.id,
      content: `![Écran noir](/kb-images/ecran-noir.svg)

1. **Vérifiez que l'ordinateur est bien allumé** (voyant allumé, bruit du ventilateur).
2. **Vérifiez le câble vidéo** entre l'écran et l'ordinateur (HDMI, DisplayPort, VGA) — débranchez et rebranchez-le fermement des deux côtés.
3. **Vérifiez que l'écran externe est allumé** et réglé sur la bonne source d'entrée (bouton *Source*/*Input* sur l'écran).
4. **Si vous utilisez un poste portable avec un écran externe**, essayez la combinaison de touches pour changer de mode d'affichage (souvent *Windows + P*), l'ordinateur envoie peut-être l'image uniquement vers l'écran externe ou inversement.
5. **Forcez une mise en veille/réveil** : appuyez brièvement sur le bouton d'alimentation, ou fermez/rouvrez le capot d'un portable.
6. **Redémarrez l'ordinateur** en maintenant le bouton d'alimentation 10 secondes s'il ne répond plus, puis rallumez-le.

Si l'écran reste noir après ces vérifications, ouvrez un ticket (catégorie *Matériel > Écran / Périphérique*) en précisant le modèle de l'écran et si le voyant d'alimentation de l'ordinateur est allumé.`,
    },
    {
      title: "Je n'ai plus de son",
      categoryId: materiel.id,
      content: `![Pas de son](/kb-images/pas-de-son.svg)

1. **Vérifiez le volume** : icône de son dans la barre des tâches, et volume physique sur les haut-parleurs/casque s'il y en a un.
2. **Vérifiez qu'aucun bouton de mise en sourdine (mute)** n'est activé, sur le clavier ou sur le casque.
3. **Vérifiez le périphérique de sortie audio sélectionné** (Windows : clic droit sur l'icône son → *Ouvrir les paramètres de son* → vérifiez que le bon haut-parleur/casque est sélectionné).
4. **Débranchez et rebranchez** le casque ou les haut-parleurs.
5. **Redémarrez l'ordinateur** — cela résout la majorité des problèmes de pilote audio.
6. **Testez avec un autre casque/haut-parleur** si possible, pour savoir si le problème vient de l'appareil ou de l'ordinateur.

Si le son ne revient toujours pas, ouvrez un ticket (catégorie *Matériel*) en précisant le modèle du casque/des haut-parleurs et si le problème touche toutes les applications ou une seule.`,
    },
    {
      title: "J'ai oublié mon mot de passe / mon compte est bloqué",
      categoryId: compteAcces.id,
      content: `![Mot de passe oublié](/kb-images/mot-de-passe.svg)

Avant d'ouvrir un ticket pour réinitialisation :

1. **Vérifiez que le verrouillage majuscules (Caps Lock)** n'est pas activé — c'est la cause la plus fréquente d'échec de connexion.
2. **Vérifiez le clavier** (certains claviers sont en QWERTY par défaut, attention à la saisie des caractères spéciaux).
3. **Attendez quelques minutes** si vous avez fait plusieurs tentatives incorrectes : certains comptes se bloquent temporairement après trop d'essais.
4. **Essayez de vous souvenir d'un ancien mot de passe** si vous l'avez changé récemment — la casse (majuscules/minuscules) compte.

Si vous ne pouvez toujours pas vous connecter, la réinitialisation du mot de passe **doit être faite par l'équipe IT** (elle ne peut pas être self-service pour des raisons de sécurité) : ouvrez un ticket (catégorie *Compte & Accès > Réinitialisation de mot de passe*) en précisant votre nom d'utilisateur. Pour des raisons de sécurité, l'équipe IT peut vous demander de confirmer votre identité avant la réinitialisation.`,
    },
    {
      title: "Une clé USB ou un périphérique n'est pas reconnu",
      categoryId: materiel.id,
      content: `![Périphérique USB non reconnu](/kb-images/usb.svg)

1. **Essayez un autre port USB** sur votre ordinateur — le port utilisé peut être défectueux.
2. **Débranchez et rebranchez** le périphérique en attendant quelques secondes entre les deux.
3. **Testez le périphérique sur un autre ordinateur** si possible, pour savoir s'il vient du périphérique ou du poste.
4. **Vérifiez qu'un voyant s'allume** sur le périphérique (clé USB, disque externe) au branchement — l'absence de voyant indique souvent un câble ou un port défectueux.
5. **Redémarrez l'ordinateur** avec le périphérique branché.
6. **Attendez l'installation automatique du pilote** : Windows affiche une notification en bas à droite lors de la première utilisation d'un nouveau périphérique — cela peut prendre une minute.

Si le périphérique n'est toujours pas reconnu, ouvrez un ticket (catégorie *Matériel*) en précisant le type de périphérique et son modèle.`,
    },
    {
      title: "Ma boîte email est pleine ou ne se synchronise plus",
      categoryId: logiciel.id,
      content: `![Boîte email pleine](/kb-images/email-plein.svg)

1. **Vérifiez votre quota de stockage** : une boîte pleine empêche la réception de nouveaux emails. Videz régulièrement votre dossier *Éléments supprimés* et *Courrier indésirable*, qui comptent souvent dans le quota.
2. **Triez les gros emails** : dans Outlook, vous pouvez trier par taille (*Affichage > Disposition des messages > Taille*) pour repérer les pièces jointes volumineuses à archiver ou supprimer.
3. **Videz le dossier "Éléments envoyés"** des anciens emails avec pièces jointes si vous n'en avez plus besoin.
4. **Vérifiez votre connexion Internet** si Outlook affiche "Déconnecté" — voir le guide *Je n'ai plus de connexion Internet ou Wi-Fi*.
5. **Redémarrez Outlook** (fermez complètement l'application puis rouvrez-la) pour forcer une nouvelle synchronisation.
6. **Vérifiez l'espace disque de votre ordinateur** si vous utilisez un fichier de données local (.pst/.ost) — un disque plein peut bloquer la synchronisation.

Si votre boîte reste pleine après un nettoyage ou si la synchronisation ne reprend pas, ouvrez un ticket (catégorie *Logiciel*) : l'équipe IT pourra augmenter votre quota si nécessaire ou diagnostiquer le problème de synchronisation.`,
    },
  ];

  const diacriticsRegex = new RegExp("[\\u0300-\\u036f]", "g");
  for (const guide of guides) {
    const existing = await prisma.knowledgeArticle.findFirst({ where: { title: guide.title } });
    if (!existing) {
      const slugBase = guide.title
        .toLowerCase()
        .normalize("NFD")
        .replace(diacriticsRegex, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .slice(0, 80);
      await prisma.knowledgeArticle.create({
        data: {
          title: guide.title,
          content: guide.content,
          categoryId: guide.categoryId,
          authorId: admin.id,
          slug: slugBase,
          isPublished: true,
        },
      });
    }
  }

  const changelogEntries = [
    {
      title: "Lancement d'ITicket",
      description: "Mise en place du système de ticketing IT : création, suivi, assignation et résolution des demandes, priorités et SLA, commentaires, tableau de bord.",
      type: "FEATURE" as const,
    },
    {
      title: "Pièces jointes, base de connaissances et canaux multiples",
      description: "Ajout des pièces jointes sur les tickets, d'une base de connaissances (FAQ) et de la prise en charge de nouveaux canaux d'entrée : email (IMAP), Slack et Teams.",
      type: "FEATURE" as const,
    },
    {
      title: "Refonte visuelle de l'application",
      description: "Nouveau design system (composants, couleurs, icônes en traits fins) et alignement de la charte graphique sur l'identité Meninx Holding.",
      type: "IMPROVEMENT" as const,
    },
    {
      title: "Sociétés, services et hiérarchie du groupe",
      description: "Gestion des sociétés (holding/filiales) avec hiérarchie, services par société, et organigramme manuel basé sur le supérieur hiérarchique de chaque utilisateur.",
      type: "FEATURE" as const,
    },
    {
      title: "Classification ITIL des demandes",
      description: "Classification des tickets à trois niveaux (type de demande, catégorie, sous-catégorie) inspirée d'ITIL, gérable par l'administrateur.",
      type: "FEATURE" as const,
    },
    {
      title: "Gestion du matériel informatique et des licences",
      description: "Inventaire du matériel (PC, écrans, imprimantes, switchs, onduleurs…) affectable à une société ou à un utilisateur, et suivi des licences logicielles avec rappels d'expiration automatiques par email.",
      type: "FEATURE" as const,
    },
    {
      title: "Processus IT formalisés (ITIL)",
      description: "Processus dédiés pour le remplacement de matériel, l'arrivée et le départ d'un collaborateur, l'acquisition de licence et les demandes d'accès applicatif, avec validation du supérieur hiérarchique, checklist de traitement et formulaires à archiver.",
      type: "FEATURE" as const,
    },
    {
      title: "Page d'accueil : mises à jour et actualités IT",
      description: "Nouvelle page d'accueil regroupant l'historique des évolutions de l'application et les dernières actualités IT/cybersécurité récupérées automatiquement.",
      type: "FEATURE" as const,
    },
  ];
  for (const entry of changelogEntries) {
    const existing = await prisma.changelogEntry.findFirst({ where: { title: entry.title } });
    if (!existing) {
      await prisma.changelogEntry.create({ data: entry });
    }
  }

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
