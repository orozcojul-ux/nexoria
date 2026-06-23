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
| `backend/discord_translate.py` | Menu traduction, réactions 🌍, context menu, slash |
| `backend/discord_gateway.py` | Gateway WebSocket — réactions 🌍 et helpers forum |
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

La traduction est **à la demande** (pas d’auto-traduction publique dans les salons).

### Traduire facilement un message

Pour traduire un message, ajoute simplement une réaction **🌍** dessus. Le bot t’enverra la traduction dans ta langue choisie lors de l’arrivée sur le serveur (rôle **Langue — …**). Si tes messages privés sont fermés, le bot répondra discrètement dans le salon ou le thread (message supprimé après 60 secondes).

Dans `#global-chat`, un message épinglé rappelle cette méthode. Pour le publier :

```bash
cd backend
python scripts/post_global_chat_translate_hint.py --confirm
```

Puis épingle le message dans Discord.

### Clic droit sur un message (alternative)

1. Clic droit sur n’importe quel message (forum, thread, `#global-chat`, salon langue, message joueur…)
2. **Applications** → **Traduire ce message**
3. Le bot répond en **message éphémère** (visible uniquement par toi)
4. La langue cible est celle de ton rôle **Langue — …** (Onboarding ou profil site). Sinon : français.
5. Un menu **Choisir une autre langue** permet de retraduire vers une autre langue.

### Commande slash (fallback)

```
/traduire message:https://discord.com/channels/GUILD/CHANNEL/MESSAGE langue:English
```

`langue` est optionnelle. Tu peux coller une URL Discord ou un ID de message (dans le salon courant).

### Forum `#inscriptions-beta`

- Réagis avec **🌍** sur n’importe quel message du thread
- Un message helper (une fois par thread) rappelle la réaction 🌍 + bouton **🌍 Traduire la candidature**
- Alternative : clic droit → **Traduire ce message**

### Messages officiels du bot

Le menu **🌍 Traduire ce message** sur les annonces Oracle / bot reste inchangé.

### Enregistrer les commandes Discord (VPS)

```bash
cd /var/www/nexoria/backend
python scripts/register_discord_translate_commands.py              # dry-run
python scripts/register_discord_translate_commands.py --confirm
```

Variables : `DISCORD_BOT_TOKEN`, `DISCORD_CLIENT_ID`.

### Tests manuels

| Scénario | Étapes | Résultat attendu |
|----------|--------|------------------|
| **Réaction 🌍** | Ajouter 🌍 sur un message dans `#global-chat` | Traduction reçue en DM (ou réponse discrète 60 s) |
| Forum `#inscriptions-beta` | Réaction 🌍 sur un post joueur | Idem |
| Thread forum | Réaction 🌍 dans un fil | Idem |
| DM fermés | Désactiver les MP du serveur, réagir avec 🌍 | Mention + traduction dans le salon, supprimée après 60 s |
| Cooldown | Deux réactions 🌍 en moins de 10 s | Seule la première est traitée |
| Langue cible | Compte avec rôle `Langue — English` | Traduction vers l’anglais |
| Clic droit | Applications → Traduire ce message | Traduction éphémère (inchangé) |
| Oracle / bot | Menu 🌍 sur message officiel | Comportement inchangé |

### Permissions bot requises

- Lire l’historique des messages (`View Channel`, `Read Message History`)
- Envoyer des messages et gérer les messages (suppression après 60 s en fallback)
- **Gateway intents** (Developer Portal → Bot) : activer **MESSAGE CONTENT INTENT** uniquement si nécessaire (le bot récupère les messages via l’API REST). Intents code : `GUILDS`, `GUILD_MESSAGES`, `GUILD_MESSAGE_REACTIONS`
- Utiliser les commandes slash / context menu (scope `applications.commands` à l’invitation)
- **Add Reactions** (optionnel — les joueurs ajoutent la réaction, pas le bot)
