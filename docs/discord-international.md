# Discord NEXORIA — International

Guide pour rendre le serveur Discord multilingue : rôles langue/pays, salons par langue, traductions bot.

## Architecture

| Couche | Rôle |
|--------|------|
| **Onboarding Discord** | Le joueur choisit langue + pays → rôles attribués par Discord |
| **Rôles Langue — *** | Accès aux salons `#français`, `#english`, etc. |
| **Rôles Pays — *** | Visibles sur le profil (origine internationale) |
| **Menu 🌍 Traduire** | Sur les messages officiels du bot (déjà en place) |
| **Profil site NEXORIA** | Changement de langue → sync rôle Discord si configuré |
| **Salons par langue** | Annonces traduites via `post_official_to_language_channels()` |

## Setup automatique (VPS)

```bash
cd /var/www/nexoria/backend   # ou chemin du backend
python scripts/setup_discord_international.py              # dry-run
python scripts/setup_discord_international.py --confirm    # applique
```

Le script :
- crée les rôles Langue / Pays manquants ;
- crée la catégorie `🌍 International` ;
- crée les 8 salons de langue + `#global-chat` ;
- ajuste les permissions `#inscriptions-beta` (public) et `#beta-test` (privé) ;
- affiche les variables `.env` à renseigner sur le VPS.

**Ne supprime jamais** de salon ni de rôle existant.

## Onboarding Discord (manuel)

L’API Discord ne permet pas de configurer l’Onboarding entièrement via bot.

1. **Paramètres du serveur → Onboarding** (serveur Community requis)
2. **Question 1** : « Quelle est ta langue principale ? »
   - Chaque réponse → rôle `Langue — …` correspondant
3. **Question 2** : « Quel est ton pays ou ta région ? »
   - Chaque réponse → rôle `Pays — …` correspondant
4. Salons par défaut suggérés : `#bienvenue`, `#règlement`, `#global-chat`, forum `#inscriptions-beta`

## Modération recommandée

- Rules Screening (vérification du règlement)
- AutoMod (anti-spam, liens suspects)
- Logs modération (Conseil Obscur)
- Hiérarchie : **rôle du bot au-dessus** des rôles Langue / Pays

## Variables `.env` (VPS — sans secrets)

Voir `backend/.env.example` section « Discord International ».

Après `--confirm`, copier les IDs affichés par le script dans le `.env` du VPS, puis redémarrer le backend.

## Code

| Fichier | Description |
|---------|-------------|
| `backend/discord_international.py` | Specs rôles/salons, `get_user_preferred_language()`, sync rôle langue |
| `backend/scripts/setup_discord_international.py` | Script de setup |
| `backend/discord_translate.py` | Menu traduction + messages ephemeral i18n |
| `backend/discord_sync.py` | Sync rôle langue si absent (à la liaison Discord) |

### `get_user_preferred_language(member)`

```python
import discord_international as di

lang = di.get_user_preferred_language(member)  # fr | en | es | de | it | pt | nl | ja
```

Priorité : rôles Discord langue → profil site → `fr`.

### Annonces multilingues

```python
await di.post_official_to_language_channels(embed, source_lang="fr")
```

Publie dans chaque `DISCORD_CHANNEL_*_ID` configuré (traduction via i18n / LibreTranslate / Gemini).

## Tests

### Nouveau compte Discord

1. Rejoindre le serveur avec un compte test
2. Compléter l’Onboarding → choisir English + USA
3. Vérifier les rôles `Langue — English` et `Pays — USA` sur le profil
4. Vérifier l’accès au salon `#english` (pas aux autres salons langue)

### Langue bot

1. Sur un message bot avec menu 🌍, choisir une langue
2. La traduction ephemeral doit s’afficher
3. Si erreur traduction, le message d’erreur suit la langue du rôle membre

### Sync site → Discord

1. Lier compte NEXORIA + Discord
2. Changer la langue dans Paramètres site → English
3. Vérifier que le rôle `Langue — English` remplace l’ancien rôle langue

### Beta

- `#inscriptions-beta` : visible par @everyone, threads publics
- `#beta-test` : visible uniquement Beta Testeur + Staff

## Traduction des messages joueurs

Non activée globalement (anti-spam). Le menu 🌍 sur les messages **officiels du bot** reste la voie principale. `#global-chat` reste multilingue avec traduction à la demande.
