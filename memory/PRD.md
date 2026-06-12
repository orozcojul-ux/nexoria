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

### v3.4 — Phase 2 Big Features (2026-02-12)
- ⚔️ **Système de Guildes complet** : création (L10 + 1000 Aether, max 50 membres), rôles chef/officier/membre, invitations bilatérales (accept/decline), promotion/rétrogradation, exclusion, chat temps réel (polling 5s, 1-500 chars), coffre commun (dépôt → +XP guilde + contribution_xp), récompenses chef/officier vers membres, niveau de guilde (1 + xp//1000), passation auto du chef à un officier sinon dissolution. Badge `founder_guild`.
- 📜 **Forum (Tribune)** : 6 catégories statiques (Salle Commune, Stratégies, Mythes, Comptoir, Recrutement, Conseil). Threads avec titre 5-120 + contenu 10-5000 → +30 XP + badge `scholar`. Replies 2-2000 → +10 XP + notif auteur. Pin/lock staff seulement. Suppression auteur ou staff. Cascade delete. Views++ avec valeur corrigée immédiate.
- 📅 **Saisons** : panel admin → `SeasonsAdmin`. Création d'une saison auto-clôture la précédente. `grant_xp()` mirrore l'XP dans `db.season_scores` (upsert idempotent) tant qu'une saison est active. À la clôture : distribution automatique — Top 1 → 5000 Aether + badge `season_champion`, Top 10 → 1500 + `season_elite`, Top 50 → 500. Notifications à tous au lancement, aux gagnants à la fin.
- 🆕 **6 nouveaux badges** : founder_guild, scholar, season_champion, season_elite (+ corrections sur grant_badge silent no-op).
- 🧭 **Nav** : nouvelles entrées « Ordres » et « Tribune » ajoutées à la sidebar (i18n FR/EN/ES/DE/IT).
- ✅ **Tests batch6** : 30/30 backend pass (`test_phase2_guilds_forum_seasons.py`). 2 bugs mineurs trouvés et corrigés (badges manquants + views post-increment).

### v3.3 — Security + Mod tools + Unified Inventory + Level gate (2026-02-12)
- 🔒 **Ban enforcement complète** : `enforce_ban_or_raise()` appelé sur les 3 chemins d'auth (login, Discord OAuth, Google session). Lors d'un bannissement, `db.user_sessions.delete_many()` invalide TOUS les tokens vivants immédiatement → impossible de bypass par OAuth ou par session existante.
- 🛡️ **Modérateurs** : nouvel accès au Conseil. `get_staff_dep` (admin+mod) sur `/admin/users`, `/admin/stats`, `/admin/logs`, `/admin/ban-history`, ban/unban. Garde-fou : un mod ne peut bannir qu'un héros standard (403 si cible mod/admin). Frontend gate les onglets admin-only (Proclamation, Boutique, Rôles, Système) et masque Edit. Bannière "Mode Modérateur" affichée.
- 🗑️ **Suppression de publications** : `DELETE /api/posts/{id}` autorisé pour l'auteur OU le staff. Cascade comments+reactions. Trail audit chronique « Publication retirée par le Conseil ».
- 🎚️ **Level gate boutique** : tous les SHOP_ITEMS ont un `unlock_level` (1-80). Achat bloqué 403 si niveau insuffisant. Cartes shop affichent "Verrouillé — Niveau X requis" + chip 🔒.
- 🏰 **Nouveaux items Royaume** : Archives du Conseil (L25, ban_history), Lien à l'Oracle (L30, oracle_unlimited), Voûte des Chroniques (L35, chronicle_full), Salle du Trône (L50), Trésorerie Royale (L60), Constellation Personnelle (L80).
- 📦 **Inventaire unifié** : 5 onglets (Reliques, Cosmétiques, Élixirs actifs, Consommables, Royaume). Tout ce que possède le héros au même endroit.
- 🔔 **Notifications "Effacer tout"** : `DELETE /api/notifications/clear` (idempotent, bulk).
- 🌍 **Carte du Monde 10s** : refresh toutes les 10s (vs 30s).
- 👑 **Badge de rôle sur profil** : "Archonte" doré pour admin, "Sentinelle" orange pour mod.
- ✅ **Tests batch5** : 15/15 pass.

### v3.2 — World Map + Shop CRUD + Profile cosmetics (2026-02-12)
- ✅ **Carte du Monde** (`/world`) : Atlas Éthérique interactif. Héros tracés sur grille runique avec positions déterministes (hash user_id), couleurs par classe, pulsation pour héros actifs (15min), tooltips au survol, modal de profil au clic. Filtres par classe + actifs uniquement. Auto-refresh 30s.
- ✅ **Admin Shop CRUD** : Onglet "Boutique" dans le Conseil. Liste statique + custom items groupés par catégorie. Création/édition/suppression d'items custom via dialog complet (SKU, nom, description, catégorie, rareté, prix, icône, boost). Items statiques verrouillés.
- ✅ **Maintenance hidden login** : Logo agrandi (w-72/96), bouton "Accès Staff" supprimé. Trigger caché : 5 clics rapides sur le logo (fenêtre 3s) OU raccourci `Ctrl+Shift+S` révèlent le formulaire de connexion staff.
- ✅ **Anti-doublon reliques** : `open_chest()` précharge le set `(name, rarity)` possédé par l'utilisateur et exclut ces items des tirages. Si tout est possédé, 50 Aether sont remboursés (`{items:[], refunded:50, reason:"all_owned"}`).
- ✅ **Raretés rééquilibrées** : weights ajustés — common 70 (vs 60), cosmic 0.02. Items légendaire/mythique/divin/cosmique nettement plus rares.
- ✅ **HeroName partout** : nouveau composant avec couleurs/icônes par rôle (admin doré + couronne, modérateur orange + bouclier). Intégré dans Feed (posts + commentaires), Leaderboards, Profile header, Admin user list, Ban history.
- ✅ **Shop optimistic update** : après achat cosmétique/royaume, bouton bascule sur "Acquis" sans attendre le refresh. Backend rejette désormais les achats en doublon (400 "Vous possédez déjà cet item").
- ✅ **Profile customization** : nouveau bouton caméra sur l'avatar (modal URL avec preview), nouveau bouton "Bannière" (dialog listant les bannières possédées, équipement via `PUT /profile {active_banner}`). Backend valide la possession.
- ✅ **Badge Polyglotte** : tracking via `user_languages` collection (upsert sur changement de langue). Badge attribué automatiquement à partir de 2 langues distinctes utilisées.
- ✅ **Notifications de badges** : `grant_badge()` push systématiquement une notification (kind=badge, sound=ding, icon dynamique) en plus de l'entrée chronique.
- ✅ **Badges Quest Finisher / Champion** : déclenchés automatiquement à 10 et 100 quêtes accomplies.
- ✅ **Quests help banner** : explication visible sur `/quests` listant les actions qui font progresser chaque type de quête.
- ✅ **Backend tests batch3** : 12/12 pass (`test_batch3_features.py`).

### v3 — Features pack (2026-02-10)
- ✅ Logo PNG officiel intégré (sidebar, landing, login, register, maintenance)
- ✅ Système de ban temporaire complet : `banned_until` + `ban_reason` sur user, check dans `get_current_user` → 403 banned, sessions invalidées immédiatement, BannedScreen UI avec countdown, `ban_history` collection auditée
- ✅ Admin edit user (level/xp/aether/reputation/role) + dialog Bannir avec presets de durée (1h, 1j, 1sem, 1mois)
- ✅ Page Maintenance avec logo cosmique pulsant + accès staff (admin/moderator)
- ✅ Mode maintenance togglable depuis le Conseil admin → `system_settings.maintenance` collection, MaintenanceGate dans App.js redirige les non-staff
- ✅ Boutique d'Aether (14 items, 4 catégories) — cosmétiques, élixirs (boosts temps-limité), consommables (parchemin de renommée, clé cosmique, catalyseur de faille), améliorations royaume
- ✅ Système boosts actifs (`user_boosts` avec expires_at), cosmétiques (`user_cosmetics`), consommables (`user_consumables`), perks (`user_perks`), purchases (`shop_purchases`)
- ✅ Settings ultra-complet : Profil (bio/quote/story/avatar/banner), Compte (change email avec password confirm, change username via Parchemin de Renommée), Sécurité (change password révoque toutes sessions), Préférences (langue), Zone Dangereuse (suppression compte irréversible)
- ✅ i18n 5 langues : FR/EN/ES/DE/IT, switcher dropdown, persisté localStorage, 60+ clés traduites
- ✅ Notifications Bell (polling 30s, son ding sur nouveaux messages, mark-all-read)
- ✅ Widgets backend : `/api/widgets/kingdom-weather` (joueurs actifs, posts du jour, nouveaux héros, top héros, météo aléatoire), `/api/widgets/events`, `/api/widgets/rifts-map`
- ✅ Discord OAuth complet (endpoints `/auth/discord/url` + `/auth/discord/exchange` + DiscordCallback page) — nécessite DISCORD_CLIENT_ID/SECRET/REDIRECT_URI dans .env
- ✅ Roles étendus : user / moderator / admin (staff = admin OU moderator pour accès maintenance)
- ✅ 5 nouvelles collections : `notifications`, `user_boosts`, `user_cosmetics`, `user_consumables`, `user_perks`, `shop_purchases`, `ban_history`, `system_settings`, `scheduled_events`

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
