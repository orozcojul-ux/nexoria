"""Nexus Online — données combat (ennemis, salles, bonus classes).

Pour ajouter un ennemi : dupliquer un bloc dans ENEMY_TEMPLATES et l'ajouter
aux spawns de COMBAT_ROOM_SPAWNS pour la room voulue.
"""
import secrets

COMBAT_ROOMS = frozenset({"arene"})

ATTACK_COOLDOWN_SEC = 1.0
ENEMY_ATTACK_COOLDOWN_SEC = 1.5
PLAYER_ATTACK_RANGE_TILES = 2.0
RESPAWN_PLAYER_SEC = 5
AI_TICK_MS = 500
LEASH_RANGE_TILES = 15

# Bonus classes (MVP — attaque de base uniquement)
CLASS_COMBAT_MODS = {
    "warrior": {"damage_mult": 1.15, "def_mult": 1.0, "crit_chance": 0.05},
    "mage": {"damage_mult": 1.15, "def_mult": 0.95, "crit_chance": 0.05},
    "assassin": {"damage_mult": 1.0, "def_mult": 0.95, "crit_chance": 0.15},
    "paladin": {"damage_mult": 1.0, "def_mult": 1.15, "crit_chance": 0.05, "heal_on_hit_pct": 0.05},
    "necromancer": {"damage_mult": 1.05, "def_mult": 1.0, "crit_chance": 0.05, "lifesteal_pct": 0.08},
    "alchemist": {"damage_mult": 1.08, "def_mult": 1.0, "crit_chance": 0.08},
    "chronomancer": {"damage_mult": 1.0, "def_mult": 1.0, "crit_chance": 0.05, "cooldown_mult": 0.9},
    "inventor": {"damage_mult": 1.05, "def_mult": 1.0, "crit_chance": 0.10},
    "explorer": {"damage_mult": 1.0, "def_mult": 1.0, "crit_chance": 0.05},
    "architect": {"damage_mult": 1.0, "def_mult": 1.08, "crit_chance": 0.05},
}

ENEMY_TEMPLATES = {
    "shadow_rat": {
        "id": "shadow_rat",
        "name": "Rat d'ombre",
        "level": 3,
        "maxHp": 80,
        "attack": 10,
        "defense": 3,
        "speed": 1.0,
        "aggroRange": 7,
        "attackRange": 1.5,
        "respawnSeconds": 25,
        "color": "#6B7280",
        "icon": "rat",
        "rewards": {
            "xp": 20,
            "aether": 5,
            "resource": {"name": "Poussière cosmique", "chance": 0.25, "qty": 1},
        },
    },
    "corrupted_guard": {
        "id": "corrupted_guard",
        "name": "Garde corrompu",
        "level": 8,
        "maxHp": 180,
        "attack": 18,
        "defense": 8,
        "speed": 0.9,
        "aggroRange": 8,
        "attackRange": 1.5,
        "respawnSeconds": 40,
        "color": "#7B3FF2",
        "icon": "guard",
        "rewards": {
            "xp": 60,
            "aether": 15,
            "resource": {"name": "Acier sombre", "chance": 0.20, "qty": 1},
            "bonus_resource": {"name": "Cœur d'ombre", "chance": 0.06, "qty": 1},
        },
    },
    "minor_specter": {
        "id": "minor_specter",
        "name": "Spectre mineur",
        "level": 10,
        "maxHp": 140,
        "attack": 22,
        "defense": 5,
        "speed": 1.3,
        "aggroRange": 9,
        "attackRange": 2.0,
        "respawnSeconds": 35,
        "color": "#38E8FF",
        "icon": "specter",
        "rewards": {
            "xp": 80,
            "aether": 20,
            "resource": {"name": "Essence arcanique", "chance": 0.20, "qty": 1},
        },
    },
    "cracked_golem": {
        "id": "cracked_golem",
        "name": "Golem fissuré",
        "level": 14,
        "maxHp": 320,
        "attack": 26,
        "defense": 14,
        "speed": 0.7,
        "aggroRange": 6,
        "attackRange": 1.5,
        "respawnSeconds": 55,
        "color": "#D6B25E",
        "icon": "golem",
        "rewards": {
            "xp": 120,
            "aether": 30,
            "resource": {"name": "Fragment ancien", "chance": 0.15, "qty": 1},
            "bonus_resource": {"name": "Cœur d'ombre", "chance": 0.12, "qty": 1},
        },
    },
}

# Spawns par room : (template_id, tx, ty)
COMBAT_ROOM_SPAWNS = {
    "arene": [
        ("shadow_rat", 8, 10),
        ("shadow_rat", 22, 10),
        ("corrupted_guard", 15, 8),
        ("minor_specter", 10, 20),
        ("minor_specter", 20, 20),
        ("cracked_golem", 15, 15),
    ],
}


def tile_distance(tx1, ty1, tx2, ty2) -> float:
    dx = tx1 - tx2
    dy = ty1 - ty2
    return (dx * dx + dy * dy) ** 0.5


def roll_damage(attacker_attack: int, target_defense: int, class_id: str) -> dict:
    """Formule MVP : max(1, atk - def*0.5) ±10%, bonus classe, critique."""
    mods = CLASS_COMBAT_MODS.get(class_id or "explorer", CLASS_COMBAT_MODS["explorer"])
    base = attacker_attack - target_defense * 0.5
    base = max(1.0, base) * mods.get("damage_mult", 1.0)
    jitter = secrets.randbelow(21) - 10  # -10 .. +10 %
    base *= 1.0 + jitter / 100.0
    crit = False
    crit_chance = int(mods.get("crit_chance", 0.05) * 100)
    if secrets.randbelow(100) < crit_chance:
        crit = True
        base *= 2.0
    return {"damage": max(1, int(base)), "critical": crit}


def player_combat_stats(user: dict) -> dict:
    """Stats dérivées niveau + classe."""
    level = int(user.get("level") or 1)
    class_id = (user.get("class_id") or "explorer").lower()
    mods = CLASS_COMBAT_MODS.get(class_id, CLASS_COMBAT_MODS["explorer"])
    max_hp = int((80 + level * 12) * (1.1 if mods.get("def_mult", 1) > 1 else 1.0))
    attack = int((10 + level * 3) * mods.get("damage_mult", 1.0))
    defense = int((5 + level * 2) * mods.get("def_mult", 1.0))
    return {
        "class_id": class_id,
        "level": level,
        "maxHp": max_hp,
        "hp": max_hp,
        "attack": attack,
        "defense": defense,
        "intelligence": 5 + level,
        "agility": 5 + level,
        "vitality": 5 + level,
    }


def public_enemy(enemy: dict) -> dict:
    return {
        "instanceId": enemy["instance_id"],
        "templateId": enemy["template_id"],
        "name": enemy["name"],
        "level": enemy["level"],
        "maxHp": enemy["max_hp"],
        "currentHp": enemy["current_hp"],
        "tx": enemy["tx"],
        "ty": enemy["ty"],
        "roomId": enemy["room_id"],
        "isDead": enemy.get("is_dead", False),
        "color": enemy.get("color"),
    }


def public_player_combat(state: dict) -> dict:
    return {
        "userId": state["user_id"],
        "hp": state["hp"],
        "maxHp": state["max_hp"],
        "targetId": state.get("target_id"),
        "isDead": state.get("is_dead", False),
        "class_id": state.get("class_id"),
        "level": state.get("level"),
    }
