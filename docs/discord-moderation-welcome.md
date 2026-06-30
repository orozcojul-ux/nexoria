# Discord NEXORIA — Modération salons & bienvenue

Guide pour verrouiller les salons informatifs et accueillir automatiquement les nouveaux membres.

## Salons verrouillés (lecture seule pour @everyone)

Les joueurs **peuvent lire** mais **ne peuvent pas écrire** :

| Salon | ID |
|-------|-----|
| bienvenue | `1514271114405216359` |
| règlement | `1514271110101995651` |
| annonces | `1514271112136228864` |
| faq | `1514271204481962146` |
| lore-du-monde | `1514271116582191158` |
| classes-et-races | `1514271118532411565` |
| création-de-perso | `1514271120415658115` |
| paroles-de-l-oracle | `1514271180268240977` |
| rôles-et-titres | `1514271122412146739` |
| chroniques-du-nexus | `1515325507208745080` |
| + salons dont le nom contient : guides, maintenance, news-du-royaume… |

**@everyone** : voir, lire l'historique, réagir — **pas** envoyer de messages ni créer de threads.

**Staff** (Gardien Suprême, Sage, Sentinelle) : voir, envoyer, gérer messages/threads.

**Bot NEXORIA** : voir, envoyer, embeds, pièces jointes, gérer messages.

## Salons laissés ouverts

Non modifiés par le script :

- `#global-chat` et salons **Langue — …** (français, english, español…)
- Forum `#inscriptions-beta` (public, candidatures)
- `#beta-test` (privé Beta Testeur + staff)
- Salons AVENTURE, GUILDES, ÉVÉNEMENTS, CRÉATIONS (discussion)
- Conseil Obscur (staff only, déjà restreint)

## Script de verrouillage

```bash
cd /var/www/nexoria/backend
source .venv/bin/activate
set -a && source .env && set +a

python scripts/lock_discord_info_channels.py              # dry-run
python scripts/lock_discord_info_channels.py --confirm    # applique
```

Le script :
- n'**supprime jamais** de salon ni de rôle ;
- n'**altère pas** les salons ouverts ;
- affiche les salons verrouillés / ignorés ;
- n'affiche **jamais** le token.

## Message de bienvenue automatique

Quand un **nouveau membre** rejoint le serveur :

1. Le bot génère une **welcome card PNG** (avatar en cercle, pseudo, style NEXORIA)
2. Le bot poste l'image + un texte d'accompagnement dans `#bienvenue` (`1514271114405216359`)
3. **Une seule fois** par membre (déduplication MongoDB)
4. Les **bots** sont ignorés
5. **Fallback** : embed + texte si la génération d'image échoue

### Permissions & intents requis

| Élément | Requis |
|---------|--------|
| **Server Members Intent** | **Oui** — Developer Portal → Bot → Privileged Gateway Intents → *Server Members Intent* |
| Gateway intents code | `GUILDS`, `GUILD_MEMBERS`, `GUILD_MESSAGES`, `GUILD_MESSAGE_REACTIONS` |
| Salon bienvenue | Bot : View Channel, Send Messages, Embed Links, **Attach Files** |
| Verrouillage bienvenue | @everyone ne peut pas écrire — le **bot** peut toujours poster (overwrite membre bot) |

Le backend démarre le Gateway automatiquement (`discord_gateway.start()`).

### Désactiver le welcome

Variable optionnelle (VPS, manuel) :

```env
DISCORD_WELCOME_ENABLED=false
DISCORD_WELCOME_CHANNEL_ID=1514271114405216359
DISCORD_REGLEMENT_CHANNEL_ID=1514271110101995651
DISCORD_WELCOME_SUBTITLE=Un nouveau héros rejoint le royaume
```

Dépendance Python : **Pillow** (`pip install Pillow`).

### Prévisualiser une carte (local)

```bash
cd backend
source .venv/bin/activate
python scripts/preview_welcome_card.py --username SmouzYi --out /tmp/welcome-test.png
```

## Tests

### Verrouillage

1. `python scripts/lock_discord_info_channels.py` — vérifier la liste
2. `--confirm` puis tester avec un compte joueur :
   - **Impossible** d'écrire dans `#règlement`, `#annonces`, `#faq`
   - **Possible** d'écrire dans `#global-chat`, salon langue, `#inscriptions-beta`

### Bienvenue

1. Activer **Server Members Intent** dans le Developer Portal
2. Redémarrer le backend : `systemctl restart nexoria-backend`
3. Rejoindre avec un **compte test** (ou simuler via un second compte)
4. Vérifier la **bannière PNG** + le texte dans `#bienvenue`
5. Rejoindre à nouveau → **pas** de second message (dédup)

### Logs

```bash
journalctl -u nexoria-backend -f
```

Rechercher :

- `discord welcome member_join`
- `discord welcome sent`
- `discord welcome skipped reason=already_sent`

Ne jamais y voir de token ou secret.

## Commandes VPS complètes

```bash
cd /var/www/nexoria/backend
source .venv/bin/activate
set -a
source .env
set +a

python scripts/lock_discord_info_channels.py
python scripts/lock_discord_info_channels.py --confirm

systemctl restart nexoria-backend
journalctl -u nexoria-backend -f
```

## Fichiers code

| Fichier | Rôle |
|---------|------|
| `backend/scripts/lock_discord_info_channels.py` | Verrouillage salons info |
| `backend/discord_welcome.py` | Orchestration bienvenue + fallback |
| `backend/discord_welcome_card.py` | Génération PNG (Pillow) |
| `backend/assets/discord/welcome_template.png` | Fond dark fantasy |
| `backend/discord_gateway.py` | Event `GUILD_MEMBER_ADD` |

Ne pas casser : traduction 🌍, `/traduire`, inscriptions-beta, beta-test, onboarding langue/pays.
