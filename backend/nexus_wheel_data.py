"""Roue du Nexus — récompenses et probabilités (source de vérité MVP).

Modifier les poids ici pour ajuster les probabilités.
Prévu pour extension future : bonus_spins, tickets, roue événementielle.
"""
import secrets as _secrets

WHEEL_COOLDOWN_HOURS = 24
WHEEL_VERSION = "mvp_daily_v1"
WHEEL_DAILY_SPINS_DEFAULT = 1
WHEEL_DAILY_SPINS_VIP = 3

# Récompenses affichées sur la roue (ordre = segments visuels, sens horaire)
NEXUS_WHEEL_REWARDS = [
    {
        "id": "ecus_50",
        "label": "50 Écus",
        "type": "aether",
        "amount": 50,
        "rewardEcus": 50,
        "rarity": "common",
        "weight": 35,
        "icon": "Coins",
        "description": "Une poignée d'Écus scintillants.",
        "color": "#D6B25E",
    },
    {
        "id": "ecus_100",
        "label": "100 Écus",
        "type": "aether",
        "amount": 100,
        "rewardEcus": 100,
        "rarity": "common",
        "weight": 30,
        "icon": "Coins",
        "description": "Le Nexus récompense ta fidélité.",
        "color": "#D6B25E",
    },
    {
        "id": "nothing",
        "label": "Silence du Nexus",
        "type": "none",
        "amount": 0,
        "rarity": "common",
        "weight": 22,
        "icon": "Moon",
        "description": "Les runes s'éteignent… le vide murmure encore.",
        "flavor": "Le Nexus médite en silence. Ta chance n'est pas morte — seulement repoussée.",
        "color": "#A9A3C7",
    },
    {
        "id": "xp_500",
        "label": "500 XP",
        "type": "xp",
        "amount": 500,
        "rarity": "rare",
        "weight": 14,
        "icon": "Zap",
        "description": "Une onde d'expérience traverse ton âme.",
        "color": "#38E8FF",
    },
    {
        "id": "ecus_250",
        "label": "250 Écus",
        "type": "aether",
        "amount": 250,
        "rewardEcus": 250,
        "rarity": "rare",
        "weight": 12,
        "icon": "Coins",
        "description": "Un flux d'Écus rares du Conseil.",
        "color": "#D6B25E",
    },
    {
        "id": "dust_5",
        "label": "Poussière cosmique ×5",
        "type": "resource",
        "amount": 5,
        "resource_id": "cosmic_dust",
        "resource_name": "Poussière cosmique",
        "rarity": "rare",
        "weight": 10,
        "icon": "Sparkles",
        "description": "Poussière stellaire pour vos crafts.",
        "color": "#7B3FF2",
    },
    {
        "id": "xp_1000",
        "label": "1000 XP",
        "type": "xp",
        "amount": 1000,
        "rarity": "epic",
        "weight": 5,
        "icon": "Zap",
        "description": "Une décharge d'expérience majeure.",
        "color": "#38E8FF",
    },
    {
        "id": "crystal_1",
        "label": "Cristal du Nexus ×1",
        "type": "resource",
        "amount": 1,
        "resource_id": "nexus_crystal",
        "resource_name": "Cristal du Nexus",
        "rarity": "epic",
        "weight": 4,
        "icon": "Gem",
        "description": "Un cristal pulsant d'énergie du Nexus.",
        "color": "#7B3FF2",
    },
    {
        "id": "shadow_heart_1",
        "label": "Cœur d'ombre ×1",
        "type": "resource",
        "amount": 1,
        "resource_id": "shadow_heart",
        "resource_name": "Cœur d'ombre",
        "rarity": "legendary",
        "weight": 2,
        "icon": "Heart",
        "description": "Essence sombre pour forger la Lame d'Obsidienne.",
        "color": "#EF4444",
    },
    {
        "id": "steel_2",
        "label": "Acier sombre ×2",
        "type": "resource",
        "amount": 2,
        "resource_id": "dark_steel",
        "resource_name": "Acier sombre",
        "rarity": "rare",
        "weight": 6,
        "icon": "Hammer",
        "description": "Alliage corrompu des profondeurs du Nexus.",
        "color": "#6B7280",
    },
    {
        "id": "chest_common",
        "label": "Coffre commun",
        "type": "chest",
        "amount": 1,
        "min_rarity": None,
        "rarity": "epic",
        "weight": 4,
        "icon": "Package",
        "description": "Un coffre scellé par les runes du royaume.",
        "color": "#3CFF9E",
    },
    {
        "id": "chest_rare",
        "label": "Coffre rare",
        "type": "chest",
        "amount": 1,
        "min_rarity": "rare",
        "rarity": "legendary",
        "weight": 2,
        "icon": "Gift",
        "description": "Un coffre aux runes violettes — récompense rare.",
        "color": "#FBBF24",
    },
    {
        "id": "badge_blessed",
        "label": "Béni du Nexus",
        "type": "blessing",
        "amount": 1,
        "duration_hours": 24,
        "badge_id": "nexus_blessed",
        "rarity": "legendary",
        "weight": 1,
        "icon": "Crown",
        "description": "Aura temporaire du Nexus (24 h).",
        "color": "#FBBF24",
    },
]


def reward_segment_index(reward_id: str) -> int:
    for i, r in enumerate(NEXUS_WHEEL_REWARDS):
        if r["id"] == reward_id:
            return i
    return 0


def pick_wheel_reward() -> dict:
    """Tirage pondéré côté serveur uniquement."""
    weights = [int(r["weight"]) for r in NEXUS_WHEEL_REWARDS]
    total = sum(weights)
    r = _secrets.randbelow(total)
    cumulative = 0
    for reward, w in zip(NEXUS_WHEEL_REWARDS, weights):
        cumulative += w
        if r < cumulative:
            return dict(reward)
    return dict(NEXUS_WHEEL_REWARDS[-1])


def public_reward(reward: dict) -> dict:
    """Projection sûre pour le client."""
    return {
        "id": reward["id"],
        "label": reward["label"],
        "type": reward["type"],
        "amount": reward.get("amount", 0),
        "rewardEcus": reward.get("rewardEcus"),
        "rarity": reward["rarity"],
        "icon": reward.get("icon", "Gift"),
        "description": reward.get("description", ""),
        "flavor": reward.get("flavor"),
        "color": reward.get("color"),
        "segmentIndex": reward_segment_index(reward["id"]),
    }
