# Discord — modération des salons & message de bienvenue

Guide pour verrouiller les salons informatifs et activer l’embed de bienvenue automatique sur le serveur NEXORIA.

---

## Vue d’ensemble

| Composant | Rôle |
|-----------|------|
| `backend/scripts/lock_discord_info_channels.py` | Verrouille les salons informatifs (lecture seule pour `@everyone`) |
| `backend/discord_welcome.py` | Construit et envoie l’embed de bienvenue |
| `backend/discord_gateway.py` | Écoute `GUILD_MEMBER_ADD` + réactions 🌍 (existant) |

---

## 1. Salons verrouillés (lecture seule joueurs)

Les joueurs (`@everyone`) peuvent **voir** et **lire l’historique**, mais **pas envoyer de messages** ni créer de fils.

### Par ID explicite

| Salon | ID |
|-------|-----|
| bienvenue | `1514271114405216359` |
| règlement | `1514271110101995651` |
| annonces | `1514271112136228864` |
| faq | `1514271204481962146` |
| lore | `1514271116582191158` |
| classes | `1514271118532411565` |
| création-perso | `1514271120415658115` |
| oracle | `1514271180268240977` |
| rôles-et-titres | `1514271122412146739` |
| chroniques | `1515325507208745080` |
| xp (flux auto) | `1514271132667347055` |
| inventaire (flux auto) | `1514271130557612052` |
| failles (flux auto) | `1514271140338470932` |

### Par nom (détection automatique)

Le script verrouille aussi les salons dont le nom contient : `bienvenue`, `règlement`, `annonces`, `faq`, `lore`, `classes`, `création`, `oracle`, `rôles`, `chroniques`, `news`, `guides`, `maintenance`, `xp`, `inventaire`, `failles`, etc.

### Permissions appliquées

| Rôle | Voir | Lire | Envoyer | Réactions |
|------|------|------|---------|-----------|
| `@everyone` | ✅ | ✅ | ❌ | ✅ |
| Gardien Suprême / Sage / Sentinelle | ✅ | ✅ | ✅ | ✅ |
| Bot NEXORIA | ✅ | ✅ | ✅ | — |

---

## 2. Salons laissés ouverts

**Jamais modifiés** par le script de verrouillage :

| Salon | ID | Raison |
|-------|-----|--------|
| inscriptions-beta | `1517470910427168770` | Public — candidatures |
| beta-test | `1517470908476821575` | Privé beta testeurs |
| salon-vip | `1517470912256016534` | Privé VIP |
| hub / global-chat | `1514271126694662387` | Discussion |
| guildes, recrutement | — | Communauté |
| fan-art, captures | — | Créations |
| agenda, défis | — | Événements |
| Conseil Obscur (staff) | `151427120*` | Staff only |

### Salons de langue (ouverts)

Détectés par nom : `global-chat`, `français`, `english`, `español`, `deutsch`, `italiano`, `português`, `nederlands`, `日本語`, etc.

---

## 3. Script de verrouillage

### Dry-run (par défaut — aucune modification)

```bash
cd /var/www/nexoria/backend
source .venv/bin/activate
set -a && source .env && set +a

python scripts/lock_discord_info_channels.py
```

Affiche :
- salons qui **seront** verrouillés + changements de permissions ;
- salons **ignorés** (ouverts ou spéciaux) ;
- erreurs sans exposer le token.

### Appliquer les changements

```bash
python scripts/lock_discord_info_channels.py --confirm
```

**Garanties :**
- ne supprime aucun salon ;
- ne supprime aucun rôle ;
- ne modifie pas les salons de la liste « ouverts » ;
- fusionne les permission overwrites existantes (beta-test, VIP, staff préservés).

---

## 4. Message de bienvenue automatique

### Comportement

Quand un **nouveau membre** rejoint le serveur :

1. Le Gateway reçoit `GUILD_MEMBER_ADD`
2. Le bot envoie un embed dans `#bienvenue` (`1514271114405216359`)
3. L’embed contient : mention, avatar (thumbnail), texte FR+EN, footer NEXORIA

### Anti-spam

- Les **bots** sont ignorés
- Un membre ne reçoit **qu’un seul** message (log MongoDB `discord_welcome_log`)
- Déduplication en session côté backend
- Pas de ping `@everyone`

### Désactiver temporairement

Variable optionnelle (à ajouter dans `.env` si besoin) :

```
DISCORD_WELCOME_ENABLED=0
```

### Salon personnalisé

```
DISCORD_WELCOME_CHANNEL_ID=1514271114405216359
```

---

## 5. Intents & permissions Discord Developer Portal

### Intents Gateway requis

| Intent | Privilégié | Usage |
|--------|------------|-------|
| GUILDS | Non | Connexion serveur |
| **GUILD_MEMBERS** | **Oui** | Arrivée de nouveaux membres |
| GUILD_MESSAGES | Non | (Gateway) |
| GUILD_MESSAGE_REACTIONS | Non | Réaction 🌍 traduction |

**Action requise :** activer **Server Members Intent** dans [Discord Developer Portal](https://discord.com/developers/applications) → Bot → Privileged Gateway Intents.

### Permissions bot dans `#bienvenue`

- Voir le salon
- Envoyer des messages
- Intégrer des liens (embeds)
- Joindre des fichiers (optionnel)

---

## 6. Déploiement VPS

```bash
cd /var/www/nexoria/backend
source .venv/bin/activate
set -a
source .env
set +a

# 1. Vérifier (dry-run)
python scripts/lock_discord_info_channels.py

# 2. Appliquer le verrouillage
python scripts/lock_discord_info_channels.py --confirm

# 3. Redémarrer le backend (active le Gateway + bienvenue)
systemctl restart nexoria-backend

# 4. Surveiller les logs
journalctl -u nexoria-backend -f
```

### Logs attendus au démarrage

```
discord gateway starting (reactions 🌍 + member welcome)
discord gateway ready as NexoriaBot
```

### Logs à l’arrivée d’un membre

```
discord member join detected: 123456789012345678
discord welcome sent: member=123456789012345678 channel=1514271114405216359
```

### Erreurs possibles

| Log | Cause | Action |
|-----|-------|--------|
| `discord welcome failed: status=403` | Permission manquante dans #bienvenue | Vérifier rôle bot |
| `discord welcome failed: status=404` | Salon ID incorrect | Vérifier `DISCORD_WELCOME_CHANNEL_ID` |
| `could not start Discord gateway` | Token absent ou intent non activé | Vérifier `.env` + Developer Portal |
| `discord gateway invalid session` | Intent GUILD_MEMBERS non activé | Activer Server Members Intent |

---

## 7. Tester le message de bienvenue

1. Activer **Server Members Intent** dans le Developer Portal
2. Redémarrer le backend
3. Rejoindre le serveur avec un **compte test** (pas le bot)
4. Vérifier l’embed dans `#bienvenue`
5. Re-vérifier qu’un second join du même compte (après leave/rejoin) ne spam pas si déjà loggé

---

## 8. Ce qui n’est pas impacté

- Traduction Discord (`/traduire`, réaction 🌍, menus select)
- inscriptions-beta (reste dans la liste « never modify »)
- beta-test (privé, non touché)
- Onboarding langue/pays
- Sync rôles classe/progression
- OAuth Discord site ↔ serveur

---

## Variables d’environnement (optionnelles)

À ajouter manuellement dans `backend/.env` si besoin — **non modifiées par ce déploiement** :

| Variable | Défaut | Description |
|----------|--------|-------------|
| `DISCORD_WELCOME_CHANNEL_ID` | `1514271114405216359` | Salon cible bienvenue |
| `DISCORD_WELCOME_ENABLED` | `1` | `0` pour désactiver |
| `DISCORD_BOT_TOKEN` | — | Requis (existant) |
| `DISCORD_GUILD_ID` | — | Requis (existant) |
| `DISCORD_GUARDIAN_ROLE_ID` | — | Staff (existant) |
| `DISCORD_SAGE_ROLE_ID` | — | Staff (existant) |
| `DISCORD_SENTINELLE_ROLE_ID` | — | Staff (existant) |
