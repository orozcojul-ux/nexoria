#!/usr/bin/env python3
"""Export game catalog (badges, titles, items, …) as JSON for i18n generation."""
import json
import sys
from pathlib import Path

# Windows console: force UTF-8 stdout
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from game_data import (  # noqa: E402
    BADGES,
    TITLES,
    ITEM_TEMPLATES,
    RARITIES,
    SKILLS,
    KINGDOM_BUILDINGS,
)
from craft_data import CRAFT_RESOURCES, CRAFT_RECIPES, CRAFT_TIERS  # noqa: E402

catalog = {
    "badges": [{"id": b["id"], "name": b["name"], "description": b.get("description", ""), "category": b.get("category", "")} for b in BADGES],
    "titles": [{"id": t["id"], "name": t["name"]} for t in TITLES],
    "items": [{"id": i["id"], "name": i["name"], "type": i.get("type", ""), "rarity": i.get("rarity", "")} for i in ITEM_TEMPLATES],
    "rarities": [{"id": k, "name": v["name"]} for k, v in RARITIES.items()],
    "skills": [{"id": s["id"], "name": s["name"], "description": s.get("description", "")} for s in SKILLS],
    "buildings": [{"id": b["id"], "name": b["name"], "description": b.get("description", "")} for b in KINGDOM_BUILDINGS],
    "craft_resources": [{"id": r["id"], "name": r["name"]} for r in CRAFT_RESOURCES.values()],
    "craft_recipes": [{"id": r["id"], "name": r["name"], "description": r.get("description", ""), "rarity": r.get("rarity", "")} for r in CRAFT_RECIPES],
    "craft_tiers": [{"id": r["id"], "label": r["label"]} for r in CRAFT_TIERS],
}

print(json.dumps(catalog, ensure_ascii=False, indent=2))
