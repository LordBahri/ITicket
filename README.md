# ITicket — Système de ticketing IT

Application web de gestion des demandes et incidents IT au sein de la société : création, suivi, assignation et résolution des tickets, avec gestion des priorités/SLA, catégories (types d'intervention), commentaires et notifications par email.

## Stack technique

- **Backend** : Node.js, Express, TypeScript, Prisma ORM, PostgreSQL, JWT, Nodemailer
- **Frontend** : React, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query

## Fonctionnalités (V1)

- Authentification (inscription / connexion) avec rôles **Utilisateur**, **Agent**, **Admin**
- Création de tickets via le portail web (canal `WEB`) — la base est prête pour ajouter d'autres canaux (`EMAIL`, `CHAT`, `API`, `PHONE`)
- Catégories (types d'intervention) et priorités configurables, avec délais de SLA (réponse / résolution)
- Calcul automatique de l'échéance SLA et détection des tickets en retard
- Assignation des tickets aux agents, changement de statut (Ouvert → En cours → En attente → Résolu → Fermé)
- Fil de commentaires par ticket, avec notes internes réservées aux agents/admins
- Notifications email (création de ticket, assignation, changement de statut, nouveau commentaire) — en dev, les emails sont simplement logués en console si aucun SMTP n'est configuré
- Tableau de bord avec statistiques (répartition par statut/priorité, tickets en retard, temps moyen de résolution)
- Administration : gestion des catégories, des priorités/SLA et des utilisateurs (rôles, activation)

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
cp .env.example .env     # ajuster DATABASE_URL, JWT_SECRET, SMTP si besoin
npm install
npm run prisma:migrate   # crée les tables
npm run seed              # crée catégories, priorités et comptes de démo
npm run dev                # démarre l'API sur http://localhost:4000
```

Comptes créés par le seed (mot de passe `Password123!`) :

| Email | Rôle |
|---|---|
| admin@societe.local | ADMIN |
| agent@societe.local | AGENT |
| user@societe.local | USER |

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
  prisma/schema.prisma   # modèle de données (User, Category, Priority, Ticket, Comment, Attachment)
  src/
    routes/               # définition des routes Express
    controllers/          # logique métier par ressource
    services/              # SLA, référence de ticket, envoi d'email
    middleware/            # authentification JWT, gestion des rôles, erreurs
frontend/
  src/
    pages/                 # écrans (Login, Dashboard, Tickets, Admin…)
    components/            # Layout, badges, route protégée
    context/                # contexte d'authentification
    api/                    # client HTTP (axios)
```

## Prochaines étapes possibles

- Ingestion des tickets par email (parsing IMAP + création automatique)
- Intégration Teams/Slack pour la création de tickets depuis le chat
- Pièces jointes (upload de fichiers sur les tickets)
- Base de connaissances (FAQ) liée aux catégories
- Historique d'audit détaillé et export de rapports
