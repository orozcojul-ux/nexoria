# NEXORIA — Product Requirements Document

## Problem Statement (Original)
Plateforme web communautaire RPG moderne "NEXORIA" — pas un jeu vidéo classique mais un réseau social RPG où chaque action de l'utilisateur fait évoluer son personnage, son royaume, sa réputation et son histoire. Design immersif, MMORPG AAA, dark mode, dégradés violet/cyan, glassmorphism, animations fluides.

## Architecture
- **Frontend**: React 19 + React Router + TailwindCSS + shadcn/ui + Framer Motion + Recharts (DNA radar) + sonner (toasts) + lucide-react (icons)
- **Backend**: FastAPI + Motor (MongoDB async) + bcrypt + emergentintegrations (Claude Sonnet 4.5)
- **Auth**: Unified `session_token` cookie for both JWT (email/password) and Emergent Google Auth
- **AI**: Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`) via Universal Emergent LLM Key

## User Personas
- **Aventurier**: Joueur casual qui poste, commente, monte en niveau, collecte badges/objets.
- **Architecte**: Joueur qui investit dans son royaume (bâtiments) et son arbre de compétences.
- **Légende**: Joueur top-tier qui vise le Hall of Legends et accumule titres mythiques.
- **Admin**: Gestion utilisateurs, modération, logs, statistiques temps réel.

## Core Requirements (Static)
1. Hero profiles: avatar, classe (10 options), niveau jusqu'à 999, XP, rang, titres, badges, ADN.
2. Système XP/niveaux avec courbe `100 * level^1.5`.
3. 10 classes RPG, 8 compétences (arbre Path of Exile style), 6 bâtiments royaume.
4. 30+ badges en 5 catégories, 8 titres déblocables.
5. 7 raretés d'objets (Commun → Cosmique) avec animations.
6. Feed social: posts, commentaires, réactions, follows.
7. Quêtes quotidiennes/hebdo/mensuelles auto-générées.
8. Oracle IA (Claude) pour conseils personnalisés + génération de quêtes.
9. Failles dimensionnelles aléatoires (35% chance, cooldown 4h).
10. Boss Mondial communautaire (cible 10 000 commentaires globaux).
11. Économie Aether (monnaie virtuelle, non pay-to-win).
12. Classements multi-catégories (XP, niveau, réputation, Aether).
13. Hall of Legends (top 10).
14. Dashboard admin (stats, users, logs).
15. Chronique vivante (timeline RPG personnelle).
16. Effets sonores WebAudio synthétisés (clic, succès, level-up, coffre, oracle, faille).

## What's Been Implemented

### v2.1 — Code Quality fixes (2026-02-10)
- ✅ Test file `ADMIN_PASSWORD` déplacé en env var (`os.environ.get`)
- ✅ `is True/False` → `==` dans les tests pytest
- ✅ Backend RNG sensible (coffres, failles, items) migré `random` → `secrets` (CSPRNG)
- ✅ Empty catch blocks loggués : `Feed.js`, `sfx.js`, `AuthContext.js` (warn/error)
- ✅ Array index as key remplacés par clés stables (chronicle_id, composite) — `Profile.js`, `Hero.js`, `Admin.js`, `Oracle.js`
- ✅ `Profile.js` `useEffect` dependency manquante `load` corrigée avec `useCallback`
- ✅ `AuthContext` refactorisé : tous les setters mémoizés via `useCallback`, `setUserState` séparé, logging d'erreurs
- ✅ Note XSS détaillée dans `api.js` expliquant pourquoi localStorage (contrainte ingress CORS wildcard) et mitigations
- ✅ `/api/auth/logout` accepte aussi le header Bearer pour invalider la session serveur
- ⏭ Refactor des composants longs (Hero, Feed, Layout, Admin) volontairement reporté — code lisible, pas de bug, risque non justifié

### v2 — Refonte "Anti-Look IA" (2026-02-10)
Transformation complète en codex RPG vivant. Aucune ressemblance SaaS.
- ✅ Nav renommée (Place Publique, Mon Héros, Constellation, Royaume, Reliques, Tableau de Chasse, Sanctuaire, Hall des Légendes, Panthéon, Conseil)
- ✅ Composants RPG custom (Ornaments.js, StarField.js) : sceaux hexagonaux, dividers runiques, ornements de coins, cercles arcaniques, brume animée, étoiles scintillantes
- ✅ Sanctuaire (Oracle) — "Voix du Sanctuaire", aucune mention IA/Claude/algorithme (prompt anti-IA renforcé, vérifié runtime)
- ✅ Tableau de Chasse — parchemins avec sceaux de cire rouge
- ✅ Reliques — cabinet de curiosités, modal "Sceau brisé"
- ✅ Constellation — sceaux hexagonaux, "Étoiles à allumer"
- ✅ Carte du Héros — rune-border animé, "Empreinte éthérique", "Sceaux gravés"
- ✅ Panthéon — pierre cosmique sculptée
- ✅ Conseil — tabs renommés (Présage, Héros enregistrés, Chroniques)
- ✅ Style typo : Unbounded (display) + Outfit (body) + JetBrains Mono (stats), ancient-text gradient doré, eldritch-glow
- ✅ Auth migrée cookie → Bearer token (localStorage) pour contourner CORS wildcard sur ingress
- ✅ Tests V2 : 36/36 backend (100%), frontend 100%

### v1 — MVP (2026-02-10)
- ✅ Auth JWT + Emergent Google Auth (unified session_token cookie)
- ✅ Landing page premium avec particules + hero card animée
- ✅ Inscription en 2 étapes (identité → sélection de classe)
- ✅ Layout responsive (sidebar desktop + bottom nav mobile)
- ✅ Page Héros: carte de profil, ADN radar, badges grid, titres, chronique
- ✅ Arbre de compétences (8 skills, allocation visuelle radiale)
- ✅ Royaume (6 bâtiments avec upgrades en Aether)
- ✅ Inventaire avec coffres aléatoires + modal d'ouverture animée
- ✅ Système de quêtes (quotidiennes/hebdo/mensuelles) + quête personnalisée Oracle
- ✅ Oracle IA fonctionnel (Claude Sonnet 4.5, réponses en français RPG)
- ✅ Feed social (posts, commentaires, réactions, follow)
- ✅ Classements (4 catégories) + Hall of Legends
- ✅ Profil utilisateur public partageable
- ✅ Failles dimensionnelles aléatoires
- ✅ Boss Mondial avec progression communautaire
- ✅ Dashboard Admin (3 onglets: overview/users/logs)
- ✅ Effets sonores WebAudio
- ✅ Backend tests 35/35 ✓

## Prioritized Backlog (v2+)
### P0 (Next iteration)
- Guildes (création, chat, coffre commun, guerres amicales)
- Forge de badges communautaires (création → vote → validation)
- OAuth Discord + GitHub
- Notifications temps réel WebSocket

### P1 (Polish)
- Widgets communautaires (quiz, sondages, roues, mini-jeux)
- Messages privés
- Bannière custom + uploads d'avatar (object storage)
- 470 badges supplémentaires pour atteindre 500+
- Animations d'ouverture coffre 3D plus poussées

### P2 (Long-term)
- Système de saisons (resets périodiques)
- Économie d'échange (marketplace Aether)
- Cartes de profil exportables en image (canvas/og:image)
- Mobile PWA installable
- Système anti-abus avancé (heuristiques multi-comptes)

## Tech Notes
- All API routes prefixed with `/api`
- MongoDB collections: `users`, `user_sessions`, `posts`, `comments`, `reactions`, `follows`, `user_badges`, `inventory`, `user_quests`, `chronicles`, `rifts`, `world_boss`, `oracle_logs`
- Custom user_id (`user_<uuid12>`) — no ObjectId leakage
- Sessions stored server-side with `expires_at`, cookie is opaque token
- Admin seeded on startup: `admin@nexoria.com` / `NexoriaAdmin2026!`
