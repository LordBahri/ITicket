import type { ManualDef } from "./types";
import { sectionLogin, sectionNewTicket, sectionKnowledgeBase, sectionAccount } from "./common";

const BASE = "/manual/agent";
const USER_BASE = "/manual/user";

export const agentManual: ManualDef = {
  role: "agent",
  title: "Manuel Agent",
  description: "Gérer les tickets de l'équipe, traiter les processus IT et répondre aux utilisateurs via le chat.",
  sections: [
    sectionLogin,
    {
      id: "accueil",
      title: "Page d'accueil",
      intro: "La page d'accueil regroupe les nouveautés de l'application et les actualités IT/cybersécurité.",
      steps: [
        {
          text: "Consultez la page d'accueil après connexion pour suivre les évolutions de l'application et les actualités IT récentes.",
          image: `${USER_BASE}/home.png`,
          imageAlt: "Page d'accueil avec le fil Quoi de neuf et les actualités IT",
        },
      ],
    },
    sectionNewTicket,
    {
      id: "tous-les-tickets",
      title: "Consulter tous les tickets",
      intro:
        "Contrairement à un utilisateur simple, un agent voit l'intégralité des tickets de toutes les sociétés dans « Tous les tickets », avec des filtres et colonnes supplémentaires (société assignée, temps écoulé).",
      steps: [
        {
          text: "Ouvrez « Tous les tickets ». Utilisez les filtres (statut, type, catégorie, priorité, société) et la recherche pour retrouver un ticket. Cochez « Archivés » pour afficher les tickets archivés (masqués par défaut).",
          image: `${BASE}/all-tickets-list.png`,
          imageAlt: "Liste de tous les tickets côté agent avec les filtres",
        },
        {
          text: "Cliquez sur la référence d'un ticket pour ouvrir sa fiche détaillée et le prendre en charge.",
        },
      ],
    },
    {
      id: "gerer-un-ticket",
      title: "Gérer un ticket (statut, assignation, archivage)",
      intro:
        "Le bloc « Gestion du ticket », visible uniquement par les agents/admins sur la fiche d'un ticket, permet de faire évoluer sa prise en charge.",
      steps: [
        {
          text: "Sur la fiche d'un ticket, repérez le bloc « Gestion du ticket » en bas de page.",
          image: `${BASE}/ticket-gestion-panel.png`,
          imageAlt: "Bloc Gestion du ticket mis en évidence sur la fiche ticket",
        },
        {
          text: "Changez le statut du ticket (Ouvert → En cours → En attente → Résolu → Fermé) via le menu déroulant « Statut », et assignez ou réassignez le ticket à un agent via le menu « Assigné à ». Le demandeur est notifié par email à chaque changement important.",
          image: `${BASE}/ticket-status-select.png`,
          imageAlt: "Menus déroulants Statut et Assigné à",
        },
        {
          text: "Vous pouvez ajouter un commentaire visible par le demandeur, ou cocher « Note interne » pour un commentaire réservé à l'équipe IT.",
        },
        {
          text: "Utilisez le bouton « Archiver » pour masquer un ticket traité de la liste principale sans le supprimer (il reste consultable via la case « Archivés »). Le bouton devient « Désarchiver » une fois le ticket archivé.",
          image: `${BASE}/ticket-archive-button.png`,
          imageAlt: "Bouton Archiver mis en évidence",
        },
      ],
    },
    {
      id: "processus-it",
      title: "Traiter une demande de processus IT",
      intro:
        "Certaines demandes (onboarding/offboarding, remplacement de matériel, accès applicatif, acquisition de licence...) suivent un processus IT formalisé avec validation hiérarchique et checklist de traitement.",
      steps: [
        {
          text: "Sur un ticket lié à un processus, un bloc dédié affiche l'état de la validation hiérarchique (si requise) et la checklist des étapes à réaliser.",
          image: `${BASE}/process-ticket-checklist.png`,
          imageAlt: "Bloc processus IT avec validation hiérarchique et checklist de traitement",
        },
        {
          text: "Cochez chaque étape au fur et à mesure de son exécution réelle (ex. création du compte AD, préparation du poste, remise du matériel...). La checklist constitue une preuve de traitement consultable à tout moment.",
          image: `${BASE}/process-checklist-checkbox.png`,
          imageAlt: "Case à cocher d'une étape de la checklist mise en évidence",
        },
        {
          text: "Si le processus requiert un formulaire papier (ex. décharge de matériel), un rappel de téléchargement/impression s'affiche à la création du ticket ; une fois le formulaire signé archivé physiquement, utilisez le bouton « Marquer l'original comme archivé » pour le tracer dans ITicket.",
        },
      ],
    },
    {
      id: "acces-sage",
      title: "Automatiser un accès Sage 100",
      intro:
        "Le processus « Accès Sage 100 » propose un bouton « Automatiser » qui exécute automatiquement trois des cinq étapes de la checklist (accès RDP au serveur applicatif, copie des fichiers de connexion, création de l'accès SQL Server).",
      steps: [
        {
          text: "Sur un ticket « Accès Sage 100 » validé, cliquez sur « Automatiser » dans le bloc dédié.",
          image: `${BASE}/sage-automate-button.png`,
          imageAlt: "Bouton Automatiser sur un ticket Accès Sage 100",
        },
        {
          text: "Le résultat de chaque étape automatisée (RDP, fichiers, SQL) s'affiche avec une coche verte en cas de succès ou une croix rouge avec le message d'erreur en cas d'échec (ex. identifiant AD manquant sur la fiche utilisateur). Les étapes réussies sont cochées automatiquement dans la checklist.",
        },
        {
          text: "La dernière étape — création de l'utilisateur dans l'application Sage 100 elle-même — reste manuelle et doit être cochée à la main une fois réalisée.",
        },
      ],
    },
    sectionKnowledgeBase,
    {
      id: "chat-inbox",
      title: "Répondre aux utilisateurs via le chat",
      intro:
        "Contrairement à un utilisateur simple qui ne voit que sa propre conversation, un agent voit la boîte de réception complète : une conversation par utilisateur, partagée entre tous les agents/admins.",
      steps: [
        {
          text: "Ouvrez « Chat » : la liste des conversations apparaît à gauche, triée par dernier message reçu. Cliquez sur une conversation pour l'ouvrir.",
          image: `${BASE}/chat-inbox.png`,
          imageAlt: "Boîte de réception du chat côté agent",
        },
        {
          text: "Écrivez votre réponse dans le champ en bas et cliquez sur « Envoyer ». La conversation est mise à jour en temps réel pour tous les agents connectés.",
          image: `${BASE}/chat-conversation-view.png`,
          imageAlt: "Conversation ouverte avec un utilisateur",
        },
        {
          text: "Survolez une conversation pour faire apparaître les actions rapides : l'icône d'archive permet de la masquer de la boîte de réception (retrouvable ensuite via « Voir les conversations archivées »). La suppression définitive d'une conversation est réservée aux administrateurs.",
          image: `${BASE}/chat-archive-icon.png`,
          imageAlt: "Icône d'archivage d'une conversation mise en évidence",
        },
        {
          text: "Le bouton « + Conversation » permet de démarrer vous-même une discussion avec un utilisateur (par exemple pour donner suite à un ticket).",
        },
      ],
    },
    {
      id: "acces-a-distance",
      title: "Accès à distance",
      intro:
        "La page « Accès à distance » (réservée aux agents/admins) centralise les identifiants de connexion à distance (AnyDesk, TeamViewer, UltraViewer) et le nom de poste de chaque utilisateur, pour faciliter une prise en main rapide.",
      steps: [
        {
          text: "Recherchez un utilisateur par nom, poste ou société pour retrouver ses identifiants de connexion à distance.",
          image: `${BASE}/remote-access-search.png`,
          imageAlt: "Barre de recherche de la page Accès à distance",
        },
      ],
    },
    sectionAccount,
  ],
};
