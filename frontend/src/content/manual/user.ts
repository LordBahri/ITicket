import type { ManualDef } from "./types";
import { sectionLogin, sectionNewTicket, sectionKnowledgeBase, sectionChatBasics, sectionAccount } from "./common";

const BASE = "/manual/user";

export const userManual: ManualDef = {
  role: "user",
  title: "Manuel Utilisateur",
  description: "Créer et suivre vos tickets, utiliser le chat support et la base de connaissances.",
  sections: [
    sectionLogin,
    {
      id: "accueil",
      title: "Page d'accueil",
      intro:
        "Après connexion, la page d'accueil regroupe deux blocs : « Quoi de neuf dans ITicket » (historique des évolutions de l'application) et « Actualités » (veille IT/cybersécurité mise à jour automatiquement).",
      steps: [
        {
          text: "Consultez la page d'accueil pour suivre les nouveautés de l'application et les actualités IT récentes. Depuis cette page, vous pouvez aussi créer un nouveau ticket ou accéder directement à la base de connaissances via les boutons en haut à droite.",
          image: `${BASE}/home.png`,
          imageAlt: "Page d'accueil avec le fil Quoi de neuf et les actualités IT",
        },
      ],
    },
    sectionNewTicket,
    {
      id: "mes-tickets",
      title: "Suivre mes tickets",
      intro:
        "La page « Mes tickets » liste uniquement les tickets que vous avez créés (un utilisateur simple ne voit jamais les tickets des autres personnes).",
      steps: [
        {
          text: "Ouvrez « Mes tickets » dans le menu. Utilisez la barre de recherche et les filtres (statut, type, catégorie, priorité) pour retrouver un ticket, et cliquez sur les en-têtes de colonnes pour trier la liste.",
          image: `${BASE}/my-tickets-list.png`,
          imageAlt: "Liste Mes tickets avec un ticket mis en évidence",
        },
        {
          text: "Cliquez sur la référence d'un ticket (ex. TCK-000012) pour ouvrir sa fiche détaillée et voir son statut, son avancement et l'historique des échanges.",
        },
      ],
    },
    {
      id: "detail-ticket",
      title: "Consulter le détail d'un ticket et échanger",
      intro:
        "La fiche ticket regroupe toutes les informations utiles : statut, priorité, personne assignée, échéance SLA, temps écoulé, ainsi qu'une timeline de progression et le fil de commentaires.",
      steps: [
        {
          text: "La timeline « Progression du ticket » retrace chaque changement de statut avec la date et la durée passée à chaque étape. Le bandeau supérieur affiche aussi le temps total écoulé depuis la création du ticket.",
          image: `${BASE}/ticket-detail.png`,
          imageAlt: "Fiche détail d'un ticket avec la timeline de progression",
        },
        {
          text: "Pour poser une question ou apporter une précision, écrivez votre message dans le champ « Ajouter un commentaire » puis cliquez sur « Envoyer ». L'équipe IT sera notifiée et pourra vous répondre directement sur le ticket.",
          image: `${BASE}/ticket-detail-comment-box.png`,
          imageAlt: "Champ d'ajout de commentaire mis en évidence sur la fiche ticket",
        },
        {
          text: "Vous pouvez également ajouter une pièce jointe à tout moment via le bouton « Ajouter » de la section Pièces jointes.",
        },
      ],
    },
    sectionKnowledgeBase,
    sectionChatBasics,
    sectionAccount,
  ],
};
