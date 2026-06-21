"""Forge du Nexus — ressources, recettes et taux de réussite.

Pour ajouter une recette : dupliquer un bloc dans CRAFT_RECIPES puis redémarrer
le backend (seed idempotent) ou insérer dans craft_recipes.
"""
from __future__ import annotations

# Taux de réussite MVP par rareté de résultat
SUCCESS_RATE_BY_RARITY = {
    "common": 1.0,
    "rare": 0.80,
    "epic": 0.55,
    "legendary": 0.25,
    "mythic": 0.15,
    "divine": 0.10,
    "cosmic": 0.05,
}

# Ressources craft — id stable + noms affichés (aliases pour sync inventaire)
CRAFT_RESOURCES = {
    "dark_steel": {
        "id": "dark_steel",
        "name": "Acier sombre",
        "aliases": ["Acier sombre", "acier sombre"],
        "icon": "Hammer",
        "color": "#6B7280",
    },
    "nexus_crystal": {
        "id": "nexus_crystal",
        "name": "Cristal du Nexus",
        "aliases": ["Cristal du Nexus", "cristal du nexus"],
        "icon": "Gem",
        "color": "#38E8FF",
    },
    "arcane_essence": {
        "id": "arcane_essence",
        "name": "Essence arcanique",
        "aliases": ["Essence arcanique", "essence arcanique"],
        "icon": "Sparkles",
        "color": "#9D4CDD",
    },
    "cosmic_dust": {
        "id": "cosmic_dust",
        "name": "Poussière cosmique",
        "aliases": ["Poussière cosmique", "Poussière Cosmique", "poussière cosmique"],
        "icon": "Sparkles",
        "color": "#A855F7",
    },
    "ancient_fragment": {
        "id": "ancient_fragment",
        "name": "Fragment ancien",
        "aliases": ["Fragment ancien", "fragment ancien"],
        "icon": "Layers",
        "color": "#D6B25E",
    },
    "shadow_heart": {
        "id": "shadow_heart",
        "name": "Cœur d'ombre",
        "aliases": ["Cœur d'ombre", "Coeur d'ombre", "cœur d'ombre"],
        "icon": "Heart",
        "color": "#EF4444",
    },
}

# Nom affiché → resource_id
_NAME_TO_RESOURCE_ID: dict[str, str] = {}
for _rid, _meta in CRAFT_RESOURCES.items():
    _NAME_TO_RESOURCE_ID[_meta["name"].lower()] = _rid
    for _alias in _meta.get("aliases", []):
        _NAME_TO_RESOURCE_ID[_alias.lower()] = _rid

FAIL_COMPENSATION = {
    "resource_id": "cosmic_dust",
    "quantity": 2,
}

# Templates inventaire / coffres — stackables, liés à player_resources via craft_resource_id
CRAFT_ITEM_TEMPLATES = [
    {
        "id": "mat_cosmic_dust",
        "name": "Poussière cosmique",
        "rarity": "rare",
        "type": "material",
        "icon": "Sparkles",
        "craft_resource_id": "cosmic_dust",
    },
    {
        "id": "mat_dark_steel",
        "name": "Acier sombre",
        "rarity": "rare",
        "type": "material",
        "icon": "Hammer",
        "craft_resource_id": "dark_steel",
    },
    {
        "id": "mat_arcane_essence",
        "name": "Essence arcanique",
        "rarity": "rare",
        "type": "material",
        "icon": "Sparkles",
        "craft_resource_id": "arcane_essence",
    },
    {
        "id": "mat_nexus_crystal",
        "name": "Cristal du Nexus",
        "rarity": "epic",
        "type": "material",
        "icon": "Gem",
        "craft_resource_id": "nexus_crystal",
    },
    {
        "id": "mat_ancient_fragment",
        "name": "Fragment ancien",
        "rarity": "epic",
        "type": "material",
        "icon": "Layers",
        "craft_resource_id": "ancient_fragment",
    },
    {
        "id": "mat_shadow_heart",
        "name": "Cœur d'ombre",
        "rarity": "legendary",
        "type": "material",
        "icon": "Heart",
        "craft_resource_id": "shadow_heart",
    },
]

CRAFT_RECIPES = [
    {
        "id": "nexus_ring",
        "name": "Anneau du Nexus",
        "description": "Anneau imprégné d'énergie stellaire. Prestige et protection symbolique.",
        "category": "accessory",
        "rarity": "epic",
        "requiredResources": {"nexus_crystal": 3, "cosmic_dust": 5},
        "costEcus": 250,
        "resultItem": {
            "name": "Anneau du Nexus",
            "type": "accessory",
            "rarity": "epic",
            "icon": "Circle",
        },
        "successRate": SUCCESS_RATE_BY_RARITY["epic"],
        "cooldownSeconds": 0,
        "isActive": True,
    },
    {
        "id": "obsidian_blade",
        "name": "Lame d'Obsidienne",
        "description": "Lame forgée dans l'ombre des failles. Tranchante et instable.",
        "category": "weapon",
        "rarity": "legendary",
        "requiredResources": {"dark_steel": 5, "shadow_heart": 2},
        "costEcus": 500,
        "resultItem": {
            "name": "Lame d'Obsidienne",
            "type": "weapon",
            "rarity": "legendary",
            "icon": "Sword",
        },
        "successRate": SUCCESS_RATE_BY_RARITY["legendary"],
        "cooldownSeconds": 30,
        "isActive": True,
    },
    {
        "id": "arcane_amulet",
        "name": "Amulette Arcanique",
        "description": "Focus arcanique stabilisé pour les mages du Nexus.",
        "category": "accessory",
        "rarity": "epic",
        "requiredResources": {"arcane_essence": 4, "ancient_fragment": 2},
        "costEcus": 400,
        "resultItem": {
            "name": "Amulette Arcanique",
            "type": "accessory",
            "rarity": "epic",
            "icon": "Gem",
        },
        "successRate": SUCCESS_RATE_BY_RARITY["epic"],
        "cooldownSeconds": 0,
        "isActive": True,
    },
    {
        "id": "artisan_chest",
        "name": "Coffre d'Artisan",
        "description": "Coffre compacté par les forgerons du Nexus. Contient une surprise artisanale.",
        "category": "consumable",
        "rarity": "rare",
        "requiredResources": {
            "nexus_crystal": 2,
            "dark_steel": 2,
            "cosmic_dust": 2,
        },
        "costEcus": 150,
        "resultItem": {
            "name": "Coffre d'Artisan",
            "type": "consumable",
            "rarity": "rare",
            "icon": "Package",
        },
        "successRate": SUCCESS_RATE_BY_RARITY["rare"],
        "cooldownSeconds": 0,
        "isActive": True,
    },
]


def resource_id_from_name(name: str) -> str | None:
    if not name:
        return None
    return _NAME_TO_RESOURCE_ID.get(name.strip().lower())


def public_resource(resource_id: str, quantity: int = 0) -> dict:
    meta = CRAFT_RESOURCES.get(resource_id, {})
    return {
        "id": resource_id,
        "name": meta.get("name", resource_id),
        "icon": meta.get("icon", "Package"),
        "color": meta.get("color", "#38E8FF"),
        "quantity": int(quantity or 0),
    }


def public_recipe(recipe: dict) -> dict:
    req = []
    for rid, qty in (recipe.get("requiredResources") or {}).items():
        req.append({**public_resource(rid, qty), "required": int(qty)})
    return {
        "id": recipe["id"],
        "name": recipe["name"],
        "description": recipe.get("description", ""),
        "category": recipe.get("category", "misc"),
        "rarity": recipe.get("rarity", "common"),
        "requiredResources": recipe.get("requiredResources", {}),
        "requiredResourcesDetail": req,
        "costEcus": int(recipe.get("costEcus") or 0),
        "resultItem": recipe.get("resultItem"),
        "successRate": float(recipe.get("successRate") or 1.0),
        "cooldownSeconds": int(recipe.get("cooldownSeconds") or 0),
        "isActive": bool(recipe.get("isActive", True)),
    }


# ── Progression forge : paliers visuels (basés sur tentatives cumulées) ──
CRAFT_TIERS = [
    {"min": 0, "id": "apprenti", "label": "Apprenti", "color": "#9CA3AF"},
    {"min": 5, "id": "forgeron", "label": "Forgeron", "color": "#3B82F6"},
    {"min": 15, "id": "artisan", "label": "Artisan", "color": "#7B3FF2"},
    {"min": 40, "id": "maitre", "label": "Maître Forgeron", "color": "#F97316"},
    {"min": 100, "id": "grand_maitre", "label": "Grand Maître du Nexus", "color": "#FBBF24"},
]

# Paliers récompensés (metric : attempts | successes | legendary_successes)
CRAFT_MILESTONES = [
    {"key": "attempts:1", "threshold": 1, "metric": "attempts", "type": "aether", "amount": 25,
     "label": "Première étincelle — +25 Écus"},
    {"key": "successes:1", "threshold": 1, "metric": "successes", "type": "xp", "amount": 50,
     "label": "Première relique — +50 XP"},
    {"key": "attempts:5", "threshold": 5, "metric": "attempts", "type": "aether", "amount": 75,
     "label": "Enclume réchauffée — +75 Écus"},
    {"key": "successes:5", "threshold": 5, "metric": "successes", "type": "aether", "amount": 100,
     "label": "Artisan en herbe — +100 Écus"},
    {"key": "attempts:10", "threshold": 10, "metric": "attempts", "type": "badge", "badge_id": "craft_forger_10",
     "label": "Badge Forgeron"},
    {"key": "successes:10", "threshold": 10, "metric": "successes", "type": "aether", "amount": 150,
     "label": "Dix reliques — +150 Écus"},
    {"key": "successes:25", "threshold": 25, "metric": "successes", "type": "badge", "badge_id": "craft_master",
     "label": "Badge Maître Forgeron"},
    {"key": "legendary_successes:1", "threshold": 1, "metric": "legendary_successes", "type": "aether", "amount": 200,
     "label": "Forge légendaire — +200 Écus"},
    {"key": "attempts:50", "threshold": 50, "metric": "attempts", "type": "badge", "badge_id": "craft_forger_50",
     "label": "Badge Artisan du Nexus"},
    {"key": "successes:50", "threshold": 50, "metric": "successes", "type": "aether", "amount": 300,
     "label": "Cinquante reliques — +300 Écus"},
    {"key": "successes:100", "threshold": 100, "metric": "successes", "type": "multi", "badge_id": "craft_grandmaster",
     "amount": 500, "label": "Badge Grand Maître + 500 Écus"},
]


def get_craft_tier(attempts: int) -> dict:
    """Retourne le palier actuel et le suivant."""
    current = CRAFT_TIERS[0]
    nxt = None
    for i, tier in enumerate(CRAFT_TIERS):
        if int(attempts or 0) >= tier["min"]:
            current = tier
            nxt = CRAFT_TIERS[i + 1] if i + 1 < len(CRAFT_TIERS) else None
    return {"current": current, "next": nxt}
