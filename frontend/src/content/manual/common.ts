import type { ManualSection } from "./types";

// Ces sections décrivent des écrans identiques quel que soit le rôle (le formulaire
// de création de ticket, la base de connaissances, le compte...) : les captures sont
// mutualisées depuis /manual/user/ pour éviter de dupliquer des images identiques.
const BASE = "/manual/user";

export const sectionLogin: ManualSection = {
  id: "connexion",
  title: "Se connecter",
  intro:
    "L'accès à ITicket se fait avec l'adresse email et le mot de passe fournis par votre administrateur IT. Il n'y a pas d'auto-inscription : seul un administrateur peut créer un compte.",
  steps: [
    {
      text: "Rendez-vous sur la page de connexion d'ITicket, saisissez votre email professionnel et votre mot de passe, puis cliquez sur « Se connecter ».",
      image: `${BASE}/login.png`,
      imageAlt: "Page de connexion ITicket avec le bouton Se connecter mis en évidence",
    },
    {
      text: "En cas de mot de passe oublié, contactez votre administrateur IT (support@meninx.tn) : lui seul peut réinitialiser un mot de passe et vous communiquer un nouveau mot de passe temporaire.",
    },
  ],
};

export const sectionNewTicket: ManualSection = {
  id: "creer-un-ticket",
  title: "Créer un ticket",
  intro:
    "Un ticket permet de signaler un incident (panne, dysfonctionnement) ou de faire une demande de service (matériel, accès, information) à l'équipe IT.",
  steps: [
    {
      text: "Dans le menu de gauche, cliquez sur « Nouveau ticket ».",
      image: `${BASE}/sidebar-nouveau-ticket.png`,
      imageAlt: "Lien Nouveau ticket mis en évidence dans le menu latéral",
    },
    {
      text: "Renseignez un titre court et une description détaillée du problème ou de la demande. Si votre demande correspond à un processus IT formalisé (ex. remplacement de matériel, arrivée d'un collaborateur, accès Sage 100...), sélectionnez-le dans la liste « Processus IT » : les champs Type/Catégorie seront alors automatiquement renseignés par le processus.",
      image: `${BASE}/new-ticket-form.png`,
      imageAlt: "Formulaire de création de ticket avec titre, description, processus IT et catégorisation",
    },
    {
      text: "Si aucun processus ne correspond, choisissez manuellement le Type de demande, la Catégorie puis la Sous-catégorie : la priorité et le délai de traitement (SLA) sont déterminés automatiquement par la sous-catégorie choisie.",
    },
    {
      text: "Vous pouvez joindre une ou plusieurs pièces jointes (photo de l'écran d'erreur, document...) directement depuis le formulaire.",
    },
    {
      text: "Cliquez sur « Créer le ticket » pour soumettre votre demande. Vous recevrez un email de confirmation et pourrez suivre son avancement dans « Mes tickets ».",
      image: `${BASE}/new-ticket-submit.png`,
      imageAlt: "Bouton Créer le ticket mis en évidence",
    },
  ],
};

export const sectionKnowledgeBase: ManualSection = {
  id: "base-de-connaissances",
  title: "Consulter la base de connaissances",
  intro:
    "La base de connaissances regroupe des guides de dépannage en libre-service (FAQ) rédigés par l'équipe IT, classés par catégorie.",
  steps: [
    {
      text: "Ouvrez « Base de connaissances » dans le menu de gauche pour parcourir la liste des articles, ou utilisez la recherche/le filtre par catégorie pour retrouver un guide précis.",
      image: `${BASE}/knowledge-base.png`,
      imageAlt: "Liste des articles de la base de connaissances",
    },
    {
      text: "Cliquez sur un article pour afficher son contenu complet (texte, images, étapes). Lors de la création d'un ticket, des articles pertinents peuvent aussi vous être suggérés automatiquement selon la catégorie choisie.",
    },
  ],
};

export const sectionChatBasics: ManualSection = {
  id: "chat-support",
  title: "Utiliser le chat avec le support IT",
  intro:
    "Le chat permet d'échanger en temps réel avec l'équipe support, en complément des tickets — utile pour une question rapide ne nécessitant pas forcément un ticket formel.",
  steps: [
    {
      text: "Ouvrez « Chat » dans le menu de gauche. Un badge rouge indique le nombre de messages non lus.",
      image: `${BASE}/chat-user.png`,
      imageAlt: "Fenêtre de chat avec le champ de saisie de message mis en évidence",
    },
    {
      text: "Écrivez votre message dans le champ en bas de l'écran et cliquez sur « Envoyer » (ou appuyez sur Entrée). Vous pouvez aussi ajouter un émoji ou joindre un fichier via les icônes à côté du champ de saisie.",
    },
    {
      text: "Les messages sont reçus en temps réel par toute l'équipe support ; un agent vous répondra dès que possible directement dans la même conversation.",
    },
  ],
};

export const sectionAccount: ManualSection = {
  id: "mon-compte",
  title: "Gérer mon compte",
  intro: "La page « Mon compte » (icône en bas de la barre latérale) permet de gérer vos informations personnelles.",
  steps: [
    {
      text: "Modifiez votre nom, votre numéro de téléphone ou votre photo de profil, puis cliquez sur « Enregistrer ».",
      image: `${BASE}/account-page.png`,
      imageAlt: "Page Mon compte avec les informations de profil",
    },
    {
      text: "Pour changer votre mot de passe, renseignez votre mot de passe actuel puis le nouveau mot de passe (deux fois), et cliquez sur « Enregistrer ».",
      image: `${BASE}/account-password-save.png`,
      imageAlt: "Formulaire de changement de mot de passe avec le bouton Enregistrer mis en évidence",
    },
  ],
};
