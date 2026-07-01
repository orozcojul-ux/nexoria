# Naria — Sentinelle automatisée (modération site NEXORIA)

## Identité

| Champ | Valeur |
|-------|--------|
| Nom | **Naria** |
| Rôle | **Sentinelle** |
| Type | Sentinelle automatisée officielle (`actorType: automated`) |
| ID virtuel | `naria_sentinelle` |

Description affichée sur la page **Communauté** : gardienne automatisée du Nexus, surveillance des échanges et alertes en cas d'abus.

## Architecture

### Backend

| Fichier | Rôle |
|---------|------|
| `backend/moderation_rules.py` | Règles multilingues, confiance, détection langue contenu |
| `backend/naria_moderation.py` | Score contextuel, avertissements i18n, logs enrichis |
| `backend/naria_language.py` | Langue joueur + `detect_content_language()` |
| `backend/naria_messages.py` | Traductions backend (8 langues) |
| `backend/naria_routes.py` | API joueur + admin |
| `backend/team_page.py` | Naria dans l'équipe publique |

### Collections MongoDB

| Collection | Usage |
|------------|--------|
| `moderation_logs` | Toutes les actions Naria / admin |
| `moderation_warnings` | Avertissements visibles joueur |
| `moderation_user_scores` | Score et compteurs par joueur |
| `reports` | Signalements joueurs (existant, réutilisé) |
| `ban_history` + champs `users.banned_until` | Bans site (existant, réutilisé) |

Champs utilisateur ajoutés pour restrictions Naria :

- `moderation_restricted_until`
- `moderation_restriction_reason`
- `moderation_restriction_by`

Champs contenu masqué (forum / chat) :

- `moderation_hidden`, `moderation_hidden_by`, `moderation_hidden_at`, `moderation_hidden_reason`

Description : Naria veille sur le Nexus, analyse les échanges dans plusieurs langues et protège la communauté en temps réel. Badge **Modération automatisée officielle**.

## Langues supportées

| Code | Langue |
|------|--------|
| `fr` | Français (défaut) |
| `en` | Anglais |
| `es` | Espagnol |
| `de` | Allemand |
| `it` | Italien |
| `pt` / `pt-BR` | Portugais brésilien |
| `nl` | Néerlandais |
| `ja` | Japonais |

### Comment Naria choisit la langue du joueur

Priorité (`naria_language.resolve_user_language`) :

1. `users.language` (langue du compte)
2. En-tête `Accept-Language` (si disponible)
3. Français par défaut

Côté frontend : `localStorage nexoria_language` synchronisé avec le compte via profil.

### Détection de la langue du contenu

`detect_content_language(text)` — heuristique locale :

- mots fréquents par langue ;
- accents français ;
- hiragana/katakana/kanji → japonais ;
- fallback : langue du compte.

**Exemple :** joueur FR écrit en anglais → analyse avec règles EN, avertissement en FR.

### Traductions frontend

- `frontend/src/i18n/translations-naria.js` (intégré au système i18n)
- `frontend/src/i18n/naria/*.json` (fichiers par locale)

Clés principales : `naria.warning.respect`, `naria.warning.spam`, `naria.content.hidden`, etc.

## Intelligence & confiance

Chaque analyse retourne :

```python
{
  "allowed": True,
  "confidence": 0.0,      # 0–1
  "severity": "low",
  "reason_code": "spam",
  "detected_language": "en",
  "user_language": "fr",
  "userMessageKey": "naria.warning.spam"
}
```

**Règles de prudence :**

| Confiance | Comportement |
|-----------|--------------|
| < 0.35 | Log seul (pas de sanction) |
| 0.35–0.55 | Avertissement (1ère infraction allégée) |
| ≥ 0.72 | Masquage possible |
| Critique + élevée | Blocage / restriction |

**Contexte joueur :**

- Veteran (niveau ≥ 15, 0 avertissement) → score × 0.65
- Nouveau compte (< 3 jours) → score × 1.25
- Score décroît après 7 jours sans infraction

## Zones surveillées

- Forum : création de sujet, réponses
- Nexus Online : tchat salle, global, trade, guilde (socket)
- Profil : bio, citation, nom affiché
- Ordres : création (nom, tag, description), chat d'ordre
- Signalements : forum, profil, messages Nexus (`nexus_room_chat`)

## Système de score

| Infraction | Points |
|------------|--------|
| Spam léger / répétition / majuscules | +1 |
| Lien suspect / insulte | +2 |
| Contournement filtre | +3 |
| Menace / haine | +5 |

**Actions selon score cumulé :**

| Score | Action |
|-------|--------|
| 1–2 | Avertissement |
| 3–4 | Masquage + avertissement |
| 5–7 | Restriction 10 min |
| 8–10 | Restriction 1 h + alerte admin |
| 10+ | Proposition ban (alerte admin) |

Le score **décroît avec le temps** (demi-vie ~7 jours, expiration ~14 jours).

## Mode prudent

```python
# backend/naria_moderation.py
AUTO_BAN_ENABLED = False  # par défaut
```

Les cas critiques sont **bloqués avant publication** ; le ban automatique n'est activé que si `AUTO_BAN_ENABLED = True` (réservé aux menaces critiques).

## Intégration ban existant

Naria utilise les mêmes champs que le panel admin :

- `users.banned_until`, `users.ban_reason`
- `ban_history` avec `banned_by: "Naria"` et `actor_type: "automated"`
- Invalidation sessions + déconnexion Nexus

Les contrôles existants (`enforce_ban_or_raise`, `enforce_forum_post`, etc.) restent inchangés.

## API

### Joueur

- `GET /api/moderation/status`
- `GET /api/moderation/warnings`
- `PUT /api/moderation/warnings/{id}/read`
- `POST /api/reports` (types étendus)

### Admin

- `GET /api/admin/moderation/dashboard`
- `GET /api/admin/moderation/logs`
- `PUT /api/admin/moderation/logs/{log_id}`
- `GET /api/admin/moderation/warnings`
- `GET /api/admin/moderation/scores`
- `POST /api/admin/moderation/scores/{user_id}/reset`
- `POST /api/admin/moderation/scores/{user_id}/reduce`
- `POST /api/admin/moderation/users/{user_id}/lift-restriction`
- `POST /api/admin/moderation/users/{user_id}/warn`

Panel frontend : `/admin?tab=moderation`

## Où voir Naria

1. **Page Communauté** (`/community`) — section équipe, carte violette « Automatisée »
2. **Panel admin** — onglet « Naria — Sentinelle »
3. **Notifications joueur** — cloche après avertissement
4. **Logs** — collection `moderation_logs`

## Comment tester

### Tests multilingues

```bash
cd backend
python -m pytest tests/test_naria_moderation.py -v
```

Cas couverts : détection FR/EN/JA, messages traduits, confiance, decay score.

### Changer la langue du compte pour tester

1. Profil → langue → English
2. Poster une insulte en anglais sur le forum
3. Notification reçue en anglais
4. Log admin : `userLanguage: en`, `detectedContentLanguage: en`

### Interface FR, message EN

1. Compte en français
2. Poster « you stupid idiot » en forum
3. Avertissement en **français**, analyse avec règles **anglaises**

### Avertissement forum

1. Poster une réponse forum contenant une insulte légère (ex. mot filtré).
2. Vérifier la notification cloche + `GET /api/moderation/warnings`.
3. Vérifier l'entrée dans `/admin?tab=moderation`.

### Restriction temporaire

1. Répéter plusieurs infractions pour monter le score ≥ 5.
2. Tenter un nouveau post → HTTP 403 avec `moderation_restricted: true`.
3. Admin peut lever via « Lever restriction ».

### Ban existant

1. Bannir un joueur via `/admin?tab=bans` (système existant).
2. Confirmer blocage connexion / forum / Nexus.
3. Naria respecte le même état — un joueur déjà banni ne peut pas poster.

### Tests automatisés

```bash
cd backend
python -m pytest tests/test_naria_moderation.py -q
```

## Build & déploiement

```bash
# Backend
cd backend
pip install -r requirements.txt
python -m pytest tests/test_naria_moderation.py -q

# Frontend
cd frontend
npm ci
npm run build
```

Redéployer backend + frontend comme d'habitude sur https://nexoria-game.fr — **aucune modification `.env` requise**.

## Rendre Naria plus stricte

1. Éditer `AUTO_BAN_ENABLED = True` dans `naria_moderation.py` (cas critiques uniquement).
2. Enrichir `BAD_WORDS` / règles dans `moderation_rules.py`.
3. Ajuster les seuils dans `decide_action()`.

## Sécurité

- Previews texte limitées à **300 caractères**
- Pas de log de mots de passe, tokens, emails complets
Champs logs enrichis :

- `userLanguage`, `detectedContentLanguage`, `confidence`, `reasonCode`, `userMessageKey`
