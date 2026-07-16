# ITicket — Système de ticketing IT

Application web de gestion des demandes et incidents IT au sein de la société : création, suivi, assignation et résolution des tickets, avec gestion des priorités/SLA, catégories (types d'intervention), commentaires, pièces jointes, base de connaissances et prise en charge de plusieurs canaux d'entrée (portail web, email, Slack, Teams).

## Stack technique

- **Backend** : Node.js, Express, TypeScript, Prisma ORM, PostgreSQL, JWT, Nodemailer, Multer, ImapFlow
- **Frontend** : React, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query

## Fonctionnalités (V1)

- Authentification par connexion (JWT) avec rôles **Utilisateur**, **Agent**, **Admin**. Les comptes sont créés uniquement par un admin (pas d'inscription libre) : il choisit la société, le service et le rôle à la création, modifiables ensuite depuis la fiche utilisateur.
- Structure de groupe : chaque utilisateur appartient à une **société** (Holding ou Filiale) et un **service**, ce qui permet de distinguer les demandes venant de la holding et des différentes filiales. Les sociétés peuvent être organisées en hiérarchie (une filiale rattachée à sa société mère), gérée depuis Administration > Sociétés, avec vue arborescente et protection contre les hiérarchies circulaires.
- Administration complète des utilisateurs et des sociétés : création, modification (nom, email, service, société, rôle, société mère) et activation/désactivation, sans jamais perdre l'historique des tickets liés.
- Classification des tickets à trois niveaux : **type de demande** (Incident, Demande de service, Problème, Changement — inspiré d'ITIL), **catégorie** (Matériel, Logiciel, Réseau, Compte & Accès, Téléphonie, Autre) et **sous-catégorie** (ex. Matériel → Imprimante / Scanner), tous gérables par l'admin.
- Priorités configurables, avec délais de SLA (réponse / résolution)
- Calcul automatique de l'échéance SLA et détection des tickets en retard
- Assignation des tickets aux agents, changement de statut (Ouvert → En cours → En attente → Résolu → Fermé)
- Fil de commentaires par ticket, avec notes internes réservées aux agents/admins
- Pièces jointes sur les tickets (upload/téléchargement sécurisé, limité aux personnes ayant accès au ticket)
- Base de connaissances (FAQ) liée aux catégories, avec suggestion d'articles lors de la création d'un ticket
- Notifications email complètes : ouverture (confirmation au demandeur + alerte aux agents), assignation (à l'assigné et au demandeur), changement de statut, fermeture (message dédié), modification (type/catégorie/sous-catégorie/priorité) et nouveau commentaire — en dev, les emails sont simplement logués en console si aucun SMTP n'est configuré
- Tableau de bord avec statistiques (répartition par statut/priorité, tickets en retard, temps moyen de résolution)
- Gestion du matériel informatique (PC, écrans, imprimantes, switchs, onduleurs, serveurs...) : catalogue de types administrable, affectation de chaque équipement à une **société** (matériel partagé : switch, onduleur, serveur...) ou à un **utilisateur** (PC, imprimante...), avec numéro de série, statut, dates d'achat/garantie. Visible depuis Administration > Matériel ainsi que sur les fiches société et utilisateur.
- Gestion des licences logicielles : nom, éditeur, clé, nombre de sièges, dates de début/expiration, affectation optionnelle à une société. Rappels automatiques par email aux administrateurs à J-30, J-7 et J-1 avant expiration.
- Administration : gestion des types de demande, catégories/sous-catégories, priorités/SLA, sociétés, utilisateurs, matériel, licences et processus IT
- **Processus IT formalisés (ITIL)** : certaines demandes (remplacement de matériel, préparation de poste pour un nouvel employé, départ d'un collaborateur, acquisition de licence, demande d'accès applicatif) suivent un processus dédié — catalogue administrable dans Administration > Processus IT (catégorie ITIL, checklist d'étapes, validation hiérarchique requise ou non, formulaire papier requis ou non). Voir la section [Processus IT](#processus-it-itil) ci-dessous.
- **Page d'accueil** : historique des évolutions de l'application (« quoi de neuf ») et actualités IT/cybersécurité récupérées automatiquement depuis des flux RSS (avec image), configurable via `NEWS_FEED_URLS`. Voir la section [Page d'accueil](#page-daccueil) ci-dessous.
- **Base de connaissances en Markdown avec images** : les articles supportent la mise en forme Markdown (titres, listes, gras, images, liens). 8 guides de dépannage libre-service sont fournis par défaut (imprimante, Wi-Fi/Internet, PC lent, écran noir, pas de son, mot de passe oublié, périphérique USB, boîte email pleine) pour les cas ne nécessitant pas forcément l'intervention de l'IT.

### Canaux d'entrée pris en charge

| Canal | Comment ça marche |
|---|---|
| **Web** | Portail utilisateur (`/tickets/new`) |
| **Email** | Un service interroge périodiquement une boîte IMAP dédiée et crée un ticket pour chaque email reçu (voir `IMAP_*` dans `.env`) |
| **Slack** | Slash command (`/ticket <titre> \| <description>`) pointant vers `POST /api/integrations/slack/command`, avec vérification de signature Slack |
| **Teams** | Webhook (ex. via Power Automate) pointant vers `POST /api/integrations/teams/webhook`, protégé par un secret partagé (`X-Teams-Secret`) |
| **API** | Le champ `channel` du ticket est extensible pour tout autre système tiers |

Chaque canal auto-provisionne l'utilisateur demandeur (par email) s'il n'existe pas encore, afin que la personne reçoive bien les notifications de suivi.

## Configuration Office 365 / Outlook (ex. support@meninx.tn)

La boîte peut servir à la fois à **envoyer** les notifications (SMTP) et à **recevoir** des emails qui créent automatiquement des tickets (IMAP). Les deux utilisent les mêmes identifiants.

**Paramètres dans `backend/.env`** (voir les exemples commentés dans `.env.example`) :

```bash
# Envoi des notifications
SMTP_HOST="smtp.office365.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="support@meninx.tn"
SMTP_PASS="<mot de passe ou mot de passe d'application>"
MAIL_FROM="Support IT Meninx <support@meninx.tn>"

# Création de tickets à partir des emails reçus
IMAP_HOST="outlook.office365.com"
IMAP_PORT=993
IMAP_SECURE=true
IMAP_USER="support@meninx.tn"
IMAP_PASS="<mot de passe ou mot de passe d'application>"
```

**Prérequis côté tenant Microsoft 365** — Microsoft désactive par défaut l'authentification SMTP/IMAP « classique » (login + mot de passe) sur de nombreux tenants. Sans cette étape, la connexion échouera même avec le bon mot de passe :

1. Dans le centre d'administration Microsoft 365 (ou via PowerShell Exchange Online), activer l'authentification SMTP et IMAP pour la boîte `support@meninx.tn` :
   ```powershell
   Set-CASMailbox -Identity support@meninx.tn -SmtpClientAuthenticationDisabled $false -ImapEnabled $true
   ```
2. Si l'authentification multifacteur (MFA) est activée sur ce compte, générer un **mot de passe d'application** dédié (Sécurité du compte Microsoft) et l'utiliser comme `SMTP_PASS` / `IMAP_PASS` plutôt que le mot de passe habituel.
3. Vérifier qu'aucune stratégie d'accès conditionnel ne bloque les connexions IMAP/SMTP depuis l'IP du serveur.

**Aucun identifiant n'est stocké dans le code** : ces valeurs restent dans `.env` (jamais commité, voir `.gitignore`) ou dans les secrets de votre environnement de déploiement.

### Qui reçoit quoi

| Événement | Destinataires |
|---|---|
| Création de ticket (« ouverture ») | Le demandeur (confirmation) + tous les agents/admins actifs |
| Assignation | L'agent assigné + le demandeur |
| Changement de statut | Le demandeur + l'agent assigné |
| Fermeture | Le demandeur + l'agent assigné (message dédié, différent d'un simple changement de statut) |
| Modification (type, catégorie, sous-catégorie, priorité) | Le demandeur + l'agent assigné |
| Nouveau commentaire (non interne) | L'autre partie (demandeur ↔ agent assigné) |

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
  prisma/schema.prisma   # modèle de données (User, Company, Service, Category, Priority, Ticket, Comment, Attachment,
                          # KnowledgeArticle, Asset, License, Process/ProcessStep/ProcessApproval,
                          # ChangelogEntry, NewsArticle)
  src/
    routes/               # définition des routes Express (dont /integrations pour Slack/Teams)
    controllers/          # logique métier par ressource
    services/              # SLA, référence de ticket, email, ingestion IMAP, provisioning utilisateur,
                            # rappel de licences, synchronisation des actualités IT (RSS)
    middleware/            # authentification JWT, gestion des rôles, upload, erreurs
docs/formulaires/         # sources des formulaires Word générés (processus IT)
frontend/
  public/kb-images/       # illustrations des guides de dépannage libre-service
  public/forms/           # formulaires Word téléchargeables (copie servie statiquement)
  src/
    pages/                 # écrans (Login, Accueil, Dashboard, Tickets, Base de connaissances, Admin…)
    components/            # Layout, badges, pièces jointes, route protégée
    context/                # contexte d'authentification
    api/                    # client HTTP (axios)
```

## Logo / identité visuelle

Le logo réel de Meninx Holding (`frontend/public/logo-meninx.png`) est utilisé dans le bandeau latéral et l'écran de connexion. Le favicon et le motif décoratif en filigrane restent une recréation vectorielle simplifiée (`frontend/public/favicon.svg`, `frontend/public/logo-mark.svg`) — remplacez-les si besoin par une déclinaison officielle du logo.

## Processus IT (ITIL)

Certaines demandes ne sont pas de simples tickets : elles suivent un **processus formalisé**, inspiré des bonnes pratiques ITIL (Change Enablement, Request Fulfilment, Access Management, Onboarding/Offboarding, Software Asset Management). Le catalogue est géré depuis **Administration > Processus IT**.

- **Catalogue seedé par défaut** : Remplacement de matériel, Préparation de poste — Nouvel employé, Départ collaborateur — Offboarding IT, Acquisition de licence logicielle, Demande d'accès applicatif (AD / Email / VPN / ERP-Sage). Chaque processus a sa propre checklist d'étapes, éditable dans l'admin.
- **Accès restreint** : seuls les utilisateurs marqués **« Responsable de service »** (case à cocher sur la fiche utilisateur) peuvent rattacher une demande à un processus, depuis le formulaire de création de ticket (`/tickets/new`).
- **Validation hiérarchique** : si le processus le requiert, la demande passe au statut *En attente de validation* et un email est envoyé au **supérieur hiérarchique** (`managerId` de la fiche utilisateur). Le valideur (ou un admin) approuve ou refuse directement depuis la fiche du ticket ; le refus exige un motif et ferme le ticket, l'approbation le repasse en `Ouvert` et prévient l'équipe IT.
- **Checklist de traitement** : une fois validée, l'équipe IT coche les étapes réalisées (achat matériel, création de compte AD, boîte email, VPN OpenVPN, accès Sage/ERP, licences…) directement sur le ticket.
- **Formulaire papier + archivage** : certains processus exigent un formulaire signé — modèle téléchargeable depuis le ticket et l'admin (`frontend/public/forms/*.docx`, sources dans `docs/formulaires/`). Une fois le document scanné et transmis à l'IT, puis l'original remis en physique, un agent/admin marque le ticket comme « archivé » (traçabilité en cas d'audit).

### Formulaires fournis

| Fichier | Processus |
|---|---|
| `formulaire-engagement-equipements.docx` | Remplacement de matériel |
| `formulaire-preparation-poste-nouvel-employe.docx` | Préparation de poste — Nouvel employé |
| `formulaire-restitution-materiel-depart.docx` | Départ collaborateur — Offboarding IT |
| `formulaire-demande-acces-applicatif.docx` | Demande d'accès applicatif |
| `formulaire-demande-acquisition-licence.docx` | Acquisition de licence logicielle |

Ces modèles reprennent la mise en forme du formulaire d'engagement fourni par l'entreprise (logo Meninx Holding, titres bleu marine, clauses numérotées, bloc de signatures). Ils peuvent être remplacés directement par vos propres modèles Word tant que le nom de fichier référencé dans `formTemplateUrl` (catalogue des processus) reste identique.

## Page d'accueil

La page d'accueil (`/`, nouvelle route racine — le tableau de bord statistique est désormais sur `/dashboard`) regroupe deux blocs :

- **Quoi de neuf dans ITicket** : historique des évolutions de l'application (nouveauté / amélioration / correction), alimenté par la table `ChangelogEntry`. Ajoutez une entrée à chaque mise à jour notable via `POST /api/changelog` (admin) ou directement en base.
- **Actualités IT** : articles récupérés automatiquement depuis des flux RSS IT/cybersécurité, avec image, résumé et lien vers la source. Un job planifié (`newsFeed.service.ts`, même mécanisme que le rappel de licences) interroge les flux toutes les `NEWS_FEED_INTERVAL_MS` (6h par défaut) au démarrage du serveur puis en continu, et déduplique par URL source. Un bouton « Synchroniser » (admin) permet de forcer une actualisation manuelle.
  - Flux configurables via `NEWS_FEED_URLS` (liste séparée par des virgules) — par défaut les avis et alertes du CERT-FR. Chaque flux est traité indépendamment : l'échec d'un flux n'empêche pas les autres de se synchroniser, et une absence totale de connectivité réseau du serveur est gérée sans faire planter l'application (message d'erreur affiché, réessai automatique au prochain cycle).
  - L'image de chaque article est extraite du flux RSS (`media:content`, `media:thumbnail`, `enclosure`, ou première image du contenu HTML) ; en son absence, une icône générique est affichée à la place.
  - **Important** : cette synchronisation nécessite que le serveur backend ait un accès sortant à Internet (comme pour le SMTP/IMAP Office 365). Si votre environnement de déploiement restreint les connexions sortantes, autorisez les domaines des flux configurés ou désactivez la fonctionnalité en laissant `NEWS_FEED_URLS` vide.

## Base de connaissances

Les articles de la base de connaissances supportent le format **Markdown** (titres, listes, gras/italique, liens, images) et sont rendus avec mise en forme sur la fiche article ; la liste affiche un extrait en texte brut (Markdown nettoyé). 8 guides de dépannage libre-service sont fournis par défaut, chacun avec une illustration dédiée (`frontend/public/kb-images/*.svg`) : imprimante, Wi-Fi/Internet, PC lent, écran noir, absence de son, mot de passe oublié, périphérique USB non reconnu, boîte email pleine. Ce sont des cas volontairement choisis pour ne **pas** nécessiter l'intervention de l'équipe IT dans la majorité des situations — chaque guide invite à ouvrir un ticket seulement si les étapes proposées ne résolvent pas le problème.

## Prochaines étapes possibles

- Liaison OAuth Slack/Teams pour retrouver automatiquement l'email réel de l'utilisateur (au lieu de l'email synthétique par défaut)
- Historique d'audit détaillé et export de rapports
- Recherche plein texte plus avancée dans la base de connaissances
- Notifications push / in-app en complément des emails
