# Nettoyage Discord NEXORIA — avant lancement officiel

Ce guide décrit comment nettoyer **uniquement les messages de test** sur le serveur Discord, sans toucher à la structure (salons, rôles, permissions, membres).

## Ce qui est supprimé

- Messages du **bot NEXORIA** dans les salons de flux automatique
- Messages de test (connexions, XP, level-up, récompenses, traductions, beta…)

## Ce qui n'est jamais supprimé

- Salons, catégories, rôles, permissions
- Membres
- Messages **épinglés** (sauf avec `--include-pinned`)
- Salons de présentation (bienvenue, règlement, annonces épinglées, FAQ, inscriptions-beta)
- Comptes joueurs, paiements, Éclats, profils (MongoDB joueurs intact)

## Salons nettoyés par défaut

| Salon | Variable `.env` | ID par défaut |
|---|---|---|
| Chroniques / connexions | `DISCORD_AUTH_FORUM_CHANNEL_ID` | `1515325507208745080` |
| Notifications (fallback) | `DISCORD_NOTIFY_CHANNEL_ID` | — |
| XP & récompenses | `DISCORD_REWARDS_CHANNEL_ID` | `1514271132667347055` |
| Level-up | `DISCORD_LEVELUP_CHANNEL_ID` | `1514271122412146739` |
| Inventaire & échanges | `DISCORD_TRADE_CHANNEL_ID` | `1514271130557612052` |
| Failles dimensionnelles | `DISCORD_RIFT_CHANNEL_ID` | `1514271140338470932` |
| Beta test | `DISCORD_BETA_TEST_CHANNEL_ID` | `1517470908476821575` |
| Oracle (tests IA) | `DISCORD_ORACLE_CHANNEL_ID` | `1514271180268240977` |

## Commandes

### 1. Dry-run (obligatoire en premier)

```powershell
cd backend
python scripts/clean_discord_history.py --dry-run
```

Affiche : serveur, salons, nombre de candidats, 5 exemples par salon, dates min/max.

### 2. Suppression réelle

```powershell
python scripts/clean_discord_history.py --confirm --bot-only
```

### 3. Salon spécifique

```powershell
python scripts/clean_discord_history.py --confirm --channel-id 1514271132667347055 --bot-only
```

### 4. Ne supprimer que les messages **avant** le lancement

```powershell
python scripts/clean_discord_history.py --dry-run --launch-cutoff 2026-06-20 --bot-only
python scripts/clean_discord_history.py --confirm --launch-cutoff 2026-06-20 --bot-only
```

Ou via `.env` : `DISCORD_LAUNCH_CUTOFF=2026-06-20`

### 5. Annonce officielle « Nouveau départ »

```powershell
python scripts/post_official_start_notice.py
python scripts/post_official_start_notice.py --dry-run
```

Ou après nettoyage :

```powershell
python scripts/clean_discord_history.py --confirm --bot-only --post-start-notice
```

### 6. Nettoyage MongoDB optionnel (logs Discord / cache)

Dry-run :

```powershell
python scripts/clean_discord_history.py --dry-run --clean-db
```

Réel (nécessite `--confirm` **et** `--confirm-db`) :

```powershell
python scripts/clean_discord_history.py --confirm --bot-only --clean-db --confirm-db
```

Collections concernées :
- `translation_cache` (entrées `key: null` uniquement)
- `discord_translatable_messages` (références messages traduisibles)
- `discord_sync_log` (logs sync rôles)
- `oracle_logs` (entrées prompt contenant « test »)

**Jamais touché** : `users`, `ecu_orders`, `vip_transactions`, `inventory`, etc.

## Éviter de supprimer des messages importants

1. Toujours lancer `--dry-run` et vérifier les exemples affichés
2. Garder `--bot-only` (défaut) — ne pas utiliser `--all-authors` sauf besoin explicite
3. Ne pas utiliser `--include-pinned` sauf si vous voulez remplacer les embeds épinglés
4. Utiliser `--launch-cutoff` pour conserver l'activité post-lancement
5. Les salons bienvenue / règlement / annonces / FAQ / inscriptions-beta sont **exclus** par défaut

## Après nettoyage

Les prochains messages automatiques (connexion, XP, level-up, boutique) seront les **premiers messages « réels »** du lancement.

Pour republier les embeds épinglés en français :

```powershell
python scripts/reorganize_discord_guild.py
```
