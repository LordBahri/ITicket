# ITicket — Système de ticketing IT

Application web de gestion des demandes et incidents IT au sein de la société : création, suivi, assignation et résolution des tickets, avec gestion des priorités/SLA, catégories (types d'intervention), commentaires, pièces jointes, base de connaissances et prise en charge de plusieurs canaux d'entrée (portail web, email, Slack, Teams).

## Stack technique

- **Backend** : Node.js, Express, TypeScript, Prisma ORM, PostgreSQL, JWT, Nodemailer, Multer, ImapFlow
- **Frontend** : React, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query

## Fonctionnalités (V1)

- Authentification par connexion (JWT) avec rôles **Utilisateur**, **Agent**, **Admin**. Les comptes sont créés uniquement par un admin (pas d'inscription libre) : il choisit la société, le service et le rôle à la création, modifiables ensuite depuis la fiche utilisateur.
- Structure de groupe : chaque utilisateur appartient à une **société** (Holding ou Filiale, gérées par l'admin) et un **service**, ce qui permet de distinguer les demandes venant de la holding et des différentes filiales.
- Classification des tickets à trois niveaux : **type de demande** (Incident, Demande de service, Problème, Changement — inspiré d'ITIL), **catégorie** (Matériel, Logiciel, Réseau, Compte & Accès, Téléphonie, Autre) et **sous-catégorie** (ex. Matériel → Imprimante / Scanner), tous gérables par l'admin.
- Priorités configurables, avec délais de SLA (réponse / résolution)
- Calcul automatique de l'échéance SLA et détection des tickets en retard
- Assignation des tickets aux agents, changement de statut (Ouvert → En cours → En attente → Résolu → Fermé)
- Fil de commentaires par ticket, avec notes internes réservées aux agents/admins
- Pièces jointes sur les tickets (upload/téléchargement sécurisé, limité aux personnes ayant accès au ticket)
- Base de connaissances (FAQ) liée aux catégories, avec suggestion d'articles lors de la création d'un ticket
- Notifications email (création de ticket, assignation, changement de statut, nouveau commentaire) — en dev, les emails sont simplement logués en console si aucun SMTP n'est configuré
- Tableau de bord avec statistiques (répartition par statut/priorité, tickets en retard, temps moyen de résolution)
- Administration : gestion des types de demande, catégories/sous-catégories, priorités/SLA, sociétés et utilisateurs

### Canaux d'entrée pris en charge

| Canal | Comment ça marche |
|---|---|
| **Web** | Portail utilisateur (`/tickets/new`) |
| **Email** | Un service interroge périodiquement une boîte IMAP dédiée et crée un ticket pour chaque email reçu (voir `IMAP_*` dans `.env`) |
| **Slack** | Slash command (`/ticket <titre> \| <description>`) pointant vers `POST /api/integrations/slack/command`, avec vérification de signature Slack |
| **Teams** | Webhook (ex. via Power Automate) pointant vers `POST /api/integrations/teams/webhook`, protégé par un secret partagé (`X-Teams-Secret`) |
| **API** | Le champ `channel` du ticket est extensible pour tout autre système tiers |

Chaque canal auto-provisionne l'utilisateur demandeur (par email) s'il n'existe pas encore, afin que la personne reçoive bien les notifications de suivi.

## Démarrage rapide (avec Docker)

```bash
docker compose up --build
```

- Frontend : http://localhost:5173
- Backend : http://localhost:4000

## Démarrage en local (sans Docker)

### 1. Base de données

Créer une base PostgreSQL et un utilisateur, par exemple :

```bash
createuser iticket -P    # mot de passe: iticket
createdb iticket -O iticket
```

### 2. Backend

```bash
cd backend
cp .env.example .env     # ajuster DATABASE_URL, JWT_SECRET, SMTP, IMAP, Slack/Teams si besoin
npm install
npm run prisma:migrate   # crée les tables
npm run seed              # crée catégories, priorités et comptes de démo
npm run dev                # démarre l'API sur http://localhost:4000
```

Il n'y a pas de page d'inscription publique : tout compte doit être créé par un admin depuis Administration > Utilisateurs (nom, email, mot de passe temporaire, rôle, société, service).

Comptes créés par le seed (mot de passe `Password123!`) :

| Email | Rôle |
|---|---|
| admin@societe.local | ADMIN |
| agent@societe.local | AGENT |
| user@societe.local | USER |

L'ingestion email et les endpoints Slack/Teams sont désactivés par défaut tant que les variables `IMAP_HOST` / `SLACK_SIGNING_SECRET` / `TEAMS_WEBHOOK_SECRET` ne sont pas renseignées dans `.env`.

### 3. Frontend

```bash
cd frontend
cp .env.example .env     # VITE_API_URL=http://localhost:4000/api
npm install
npm run dev                # démarre l'app sur http://localhost:5173
```

## Structure du projet

```
backend/
  prisma/schema.prisma   # modèle de données (User, Category, Priority, Ticket, Comment, Attachment, KnowledgeArticle)
  src/
    routes/               # définition des routes Express (dont /integrations pour Slack/Teams)
    controllers/          # logique métier par ressource
    services/              # SLA, référence de ticket, email, ingestion IMAP, provisioning utilisateur
    middleware/            # authentification JWT, gestion des rôles, upload, erreurs
frontend/
  src/
    pages/                 # écrans (Login, Dashboard, Tickets, Base de connaissances, Admin…)
    components/            # Layout, badges, pièces jointes, route protégée
    context/                # contexte d'authentification
    api/                    # client HTTP (axios)
```

## Logo / identité visuelle

La marque (icône + favicon) est une recréation vectorielle inspirée du logo Meninx Holding, en l'absence d'accès au fichier original. Pour utiliser le vrai logo, remplacez simplement :
- `frontend/public/logo-mark.svg` (icône seule, fond transparent)
- `frontend/public/favicon.svg` (icône sur fond bleu marine, utilisée comme favicon)

## Prochaines étapes possibles

- Liaison OAuth Slack/Teams pour retrouver automatiquement l'email réel de l'utilisateur (au lieu de l'email synthétique par défaut)
- Historique d'audit détaillé et export de rapports
- Recherche plein texte plus avancée dans la base de connaissances
- Notifications push / in-app en complément des emails
