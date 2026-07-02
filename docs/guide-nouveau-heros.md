# Guide du Nouveau Héros

Didacticiel RP guidé par **Naria — Sentinelle du Nexus** pour accueillir les nouveaux joueurs sur NEXORIA.

## Concept

- **Nom du système :** Guide du Nouveau Héros
- **Quête RP :** Premiers pas dans le Nexus
- **Guide :** Naria (Sentinelle du Nexus, jamais « bot » ou « automatisée »)

## Déclenchement

Le didacticiel s'ouvre automatiquement si :

- l'utilisateur est connecté ;
- `tutorialCompleted` est `false` ;
- `tutorialSkipped` est `false` ;
- le compte n'est pas un compte système (Naria, Shumi, etc.).

Relance manuelle :

- bouton **? Guide** (interface connectée) ;
- **Paramètres → Guide du Nouveau Héros → Rejouer le didacticiel**.

Les admins déjà complétés ne voient pas l'auto-ouverture, sauf relance manuelle.

## Étapes

| # | ID | Validation |
|---|-----|------------|
| 1 | `welcome` | Commencer |
| 2 | `profile` | Visite `/hero` ou « J'ai compris » |
| 3 | `class` | Classe existante ou visite `/classes` |
| 4 | `community` | Visite `/communaute` |
| 5 | `nexus` | Ouverture Nexus Online ou visite |
| 6 | `chat` | Premier message Nexus ou « J'ai compris » |
| 7 | `progression` | Visite inventaire/quêtes ou « J'ai compris » |
| 8 | `complete` | Terminer la quête + récompenses |

## Récompenses (une seule fois)

- **+50 XP**
- **+25 Écus** (`aether`)
- **Badge :** `nouveau_heros` (« Nouveau Héros »)

Le backend vérifie `rewardsClaimed` — impossible de réclamer deux fois.

## MongoDB

### Collection `onboarding_progress`

| Champ | Type | Description |
|-------|------|-------------|
| `userId` | string | ID joueur (unique) |
| `currentStep` | int | Index étape courante |
| `completedSteps` | string[] | IDs complétés |
| `skipped` | bool | Passé sans terminer |
| `completed` | bool | Quête terminée |
| `rewardsClaimed` | bool | Récompenses distribuées |
| `replayMode` | bool | Rejeu manuel |
| `tutorialStartedAt` | ISO | Début |
| `tutorialCompletedAt` | ISO | Fin |
| `createdAt` / `updatedAt` | ISO | Audit |

### Champs miroir sur `users`

- `tutorialCompleted`
- `tutorialSkipped`
- `tutorialRewardsClaimed`
- `tutorialStep`
- `tutorialStartedAt`
- `tutorialCompletedAt`

## Routes API

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/onboarding/me` | État + checklist |
| POST | `/api/onboarding/start` | Démarre (option `replay`) |
| POST | `/api/onboarding/step` | Valide une étape `{ step, event }` |
| POST | `/api/onboarding/skip` | Passer le didacticiel |
| POST | `/api/onboarding/complete` | Terminer + récompenses |
| POST | `/api/onboarding/reward` | Réclamer récompenses (idempotent) |
| POST | `/api/onboarding/replay` | Réinitialiser pour rejeu |
| GET | `/api/admin/onboarding/stats` | Stats staff |

`event` : `visit` | `acknowledge` | `advance`

## Fichiers principaux

### Backend

- `backend/onboarding.py` — logique + routes
- `backend/game_data.py` — badge `nouveau_heros`
- `backend/server.py` — enregistrement routes, hooks Nexus, pulse admin

### Frontend

- `frontend/src/contexts/OnboardingContext.jsx`
- `frontend/src/components/onboarding/*`
- `frontend/src/i18n/translations-onboarding.js`
- `frontend/src/lib/onboarding-steps.js`

## i18n

Clés sous le préfixe `tutorial.*` (fr, en, es, de, it, pt, nl, ja).

## Admin

Le **Pulse** admin affiche :

- `onboarding_started`
- `onboarding_completed`
- `onboarding_completion_rate`

## Tests locaux

### Backend

```bash
cd backend
python -m pytest tests/test_onboarding.py -q
```

### Frontend

```bash
cd frontend
npm run build
```

### Scénario manuel

1. Créer un compte test → didacticiel auto à la connexion.
2. Passer les étapes / visiter profil, communauté, Nexus.
3. Terminer → vérifier XP, Écus, badge.
4. Reconnecter → didacticiel ne s'ouvre plus.
5. Paramètres → Rejouer → didacticiel sans double récompense.
6. Changer la langue → textes traduits.

## Réinitialiser un joueur (support)

```javascript
db.onboarding_progress.updateOne(
  { userId: "USER_ID" },
  {
    $set: {
      currentStep: 0,
      completedSteps: [],
      skipped: false,
      completed: false,
      rewardsClaimed: false,
      replayMode: false,
      tutorialStartedAt: null,
      tutorialCompletedAt: null,
    },
  },
);
db.users.updateOne(
  { user_id: "USER_ID" },
  {
    $set: {
      tutorialCompleted: false,
      tutorialSkipped: false,
      tutorialRewardsClaimed: false,
      tutorialStep: 0,
      tutorialStartedAt: null,
      tutorialCompletedAt: null,
    },
  },
);
```

## Build & déploiement

```bash
cd backend && python -m pytest tests/test_onboarding.py -q
cd frontend && npm ci && npm run build
```

Redémarrer l'API FastAPI et déployer le build frontend sur https://nexoria-game.fr
