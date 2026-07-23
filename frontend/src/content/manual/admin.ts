import type { ManualDef } from "./types";

const BASE = "/manual/admin";

export const adminManual: ManualDef = {
  role: "admin",
  title: "Manuel Administrateur",
  description:
    "Tableau de bord et statistiques, administration des sociétés/utilisateurs/matériel/licences/processus, et paramétrage du catalogue ITicket.",
  sections: [
    {
      id: "tableau-de-bord",
      title: "Tableau de bord et statistiques",
      intro:
        "Le tableau de bord (menu « Tableau de bord », réservé aux administrateurs) donne une vue d'ensemble de l'activité support : indicateurs clés, répartition par statut/priorité, et détail par société, par agent et par utilisateur.",
      steps: [
        {
          text: "Les 4 cartes en haut résument le total de tickets, les tickets ouverts, en cours, et en retard sur le SLA. Les deux graphiques affichent la répartition par statut et par priorité.",
          image: `${BASE}/dashboard.png`,
          imageAlt: "Tableau de bord avec les indicateurs et graphiques",
        },
        {
          text: "Plus bas, trois tableaux détaillent l'activité par société, par agent (assigné) et par utilisateur (demandeur), avec le total, les tickets ouverts/résolus/en retard, le temps moyen de résolution et le temps total écoulé. Pour la société, le « Temps total » sert de base de facturation du support aux filiales.",
        },
        {
          text: "Cliquez sur « Exporter en PDF » pour générer un rapport structuré (logo, indicateurs, tableaux) prêt à être partagé ou archivé.",
          image: `${BASE}/dashboard-export-pdf.png`,
          imageAlt: "Bouton Exporter en PDF mis en évidence",
        },
      ],
    },
    {
      id: "administration-societes",
      title: "Administration : Sociétés",
      intro:
        "La section « Administration IT > Sociétés » gère la structure du groupe : société holding, filiales, hiérarchie et services associés.",
      steps: [
        {
          text: "Cliquez sur « + Nouvelle société » pour créer une société (holding ou filiale), en la rattachant éventuellement à une société parente pour construire la hiérarchie du groupe.",
          image: `${BASE}/admin-companies.png`,
          imageAlt: "Liste des sociétés avec le bouton de création mis en évidence",
        },
        {
          text: "Ouvrez une société pour gérer ses services, voir ses filiales rattachées, son matériel, ses licences et ses utilisateurs. Pour l'accès Sage 100, renseignez le champ « Nom de la base Sage 100 » (ex. « Holding ») sur la fiche de la société.",
        },
        {
          text: "La suppression d'une société est définitive mais sans perte de données : ses utilisateurs, matériels et licences sont automatiquement réattribués à la société système « Société supprimée », et ses filiales deviennent des sociétés de premier niveau.",
        },
      ],
    },
    {
      id: "administration-utilisateurs",
      title: "Administration : Utilisateurs",
      intro:
        "La section « Administration IT > Utilisateurs » gère les comptes de tous les collaborateurs (utilisateurs, agents, administrateurs).",
      steps: [
        {
          text: "Cliquez sur « + Nouvel utilisateur » pour créer un compte.",
          image: `${BASE}/admin-users.png`,
          imageAlt: "Liste des utilisateurs avec le bouton de création mis en évidence",
        },
        {
          text: "Renseignez le nom, l'email, le rôle (Utilisateur / Agent / Administrateur), la société et, si besoin, les détails supplémentaires (matricule, téléphone, poste, identifiants AnyDesk/TeamViewer/UltraViewer, identifiant AD, supérieur hiérarchique). Un mot de passe temporaire est généré automatiquement et affiché une seule fois : transmettez-le au collaborateur concerné.",
          image: `${BASE}/admin-users-create-form.png`,
          imageAlt: "Formulaire de création d'utilisateur",
        },
        {
          text: "Un changement de rôle ou une désactivation de compte s'applique immédiatement, y compris si l'utilisateur a déjà une session ouverte : il n'a plus besoin de se reconnecter pour que le changement prenne effet.",
        },
        {
          text: "La suppression d'un utilisateur est définitive mais sans perte de données : ses tickets, commentaires et autres traces sont réattribués au compte système « Utilisateur supprimé » (exclu des statistiques). Sa conversation de chat personnelle est en revanche définitivement supprimée.",
        },
      ],
    },
    {
      id: "administration-materiel",
      title: "Administration : Matériel",
      intro:
        "L'inventaire du matériel informatique (PC, écrans, imprimantes, switchs, onduleurs, serveurs...) est accessible dans « Administration IT > Matériel ».",
      steps: [
        {
          text: "Cliquez sur « + Nouveau matériel », choisissez son type dans le catalogue, renseignez le numéro de série, le modèle, le statut (en service / en stock / en maintenance / retiré) et affectez-le à une société (matériel partagé comme un switch) ou à un utilisateur (PC, imprimante individuelle...).",
          image: `${BASE}/admin-assets.png`,
          imageAlt: "Inventaire du matériel informatique",
        },
        {
          text: "Le catalogue des types de matériel (Administration IT > Matériel > gestion des types) permet d'ajouter de nouvelles catégories d'équipement au besoin.",
        },
      ],
    },
    {
      id: "administration-licences",
      title: "Administration : Licences",
      intro: "La gestion des licences logicielles se trouve dans « Administration IT > Licences ».",
      steps: [
        {
          text: "Cliquez sur « + Nouvelle licence » et renseignez le nom, l'éditeur, le nombre de sièges, les dates de début/expiration, et éventuellement la société concernée. Des rappels automatiques par email sont envoyés aux administrateurs à J-30, J-7 et J-1 avant expiration.",
          image: `${BASE}/admin-licenses.png`,
          imageAlt: "Liste des licences logicielles",
        },
      ],
    },
    {
      id: "administration-processus",
      title: "Administration : Processus IT",
      intro:
        "Le catalogue des processus IT formalisés (onboarding, offboarding, remplacement de matériel, accès applicatif, acquisition de licence...) se gère dans « Administration IT > Processus IT ».",
      steps: [
        {
          text: "Cliquez sur « + Nouveau processus » pour créer un processus : nom, catégorie ITIL, type/catégorie/sous-catégorie de rattachement, nécessité d'une validation hiérarchique et/ou d'un formulaire papier, et la checklist des étapes de traitement.",
          image: `${BASE}/admin-processes.png`,
          imageAlt: "Catalogue des processus IT",
        },
        {
          text: "Pour un processus qui doit bénéficier de l'automatisation Sage 100, activez l'option dédiée et associez les étapes correspondantes (RDP / Fichiers / SQL) à leur clé d'automatisation depuis la configuration de l'étape.",
        },
      ],
    },
    {
      id: "administration-iticket",
      title: "Administration ITicket : Types, Catégories, Priorités",
      intro:
        "Cette section (menu « Administration ITicket ») configure la classification à trois niveaux des demandes : Type de demande → Catégorie → Sous-catégorie, chaque sous-catégorie déterminant automatiquement la priorité et le SLA.",
      steps: [
        {
          text: "« Types de demande » : les grandes familles de demandes (Incident, Demande de service, Problème, Changement, Demande de processus IT...).",
          image: `${BASE}/admin-ticket-types.png`,
          imageAlt: "Liste des types de demande",
        },
        {
          text: "« Catégories » : rattachées à un type de demande (ex. Matériel, Logiciel, Réseau sous Incident).",
          image: `${BASE}/admin-categories.png`,
          imageAlt: "Liste des catégories",
        },
        {
          text: "« Priorités & SLA » : chaque priorité définit un délai de première réponse et un délai de résolution, qui déterminent l'échéance SLA affichée sur chaque ticket.",
          image: `${BASE}/admin-priorities.png`,
          imageAlt: "Liste des priorités et de leurs délais SLA",
        },
      ],
    },
    {
      id: "suppression-ticket",
      title: "Supprimer définitivement un ticket",
      intro:
        "Contrairement à l'archivage (réversible, disponible pour les agents), la suppression d'un ticket est réservée aux administrateurs et définitive.",
      steps: [
        {
          text: "Sur la fiche d'un ticket, dans le bloc « Gestion du ticket », cliquez sur « Supprimer ».",
          image: `${BASE}/ticket-delete-button.png`,
          imageAlt: "Bouton Supprimer mis en évidence sur la fiche ticket",
        },
        {
          text: "Une boîte de confirmation rappelle que le ticket, ses commentaires, ses pièces jointes et son historique seront définitivement supprimés. Confirmez uniquement si vous êtes certain de vouloir supprimer ce ticket.",
          image: `${BASE}/ticket-delete-confirm.png`,
          imageAlt: "Boîte de confirmation de suppression du ticket",
        },
      ],
    },
  ],
};
