"""Nexus Online — combat temps réel (room-scoped, backend authoritative)."""
import asyncio
import logging
import secrets
import time
import uuid
from datetime import datetime, timezone
from typing import Callable, Optional

from nexus_combat_data import (
    AI_TICK_MS,
    ATTACK_COOLDOWN_SEC,
    COMBAT_ROOM_SPAWNS,
    COMBAT_ROOMS,
    CLASS_COMBAT_MODS,
    ENEMY_ATTACK_COOLDOWN_SEC,
    LEASH_RANGE_TILES,
    PLAYER_ATTACK_RANGE_TILES,
    RESPAWN_PLAYER_SEC,
    player_combat_stats,
    public_enemy,
    public_player_combat,
    roll_damage,
    tile_distance,
)

logger = logging.getLogger("nexoria.combat")

_room_enemies: dict[str, dict[str, dict]] = {}
_player_combat: dict[str, dict] = {}
_rate_limit: dict[str, list[float]] = {}
_db = None
_hooks: dict = {}
_sio = None
_get_player_by_sid: Optional[Callable] = None
_get_players_in_room: Optional[Callable] = None
_ai_task = None


def _now_iso():
    return datetime.now(timezone.utc).isoformat()


def is_combat_room(room_id: str) -> bool:
    return room_id in COMBAT_ROOMS


def _new_enemy_instance(template_id: str, room_id: str, tx: int, ty: int) -> dict:
    from nexus_combat_data import ENEMY_TEMPLATES
    tpl = ENEMY_TEMPLATES[template_id]
    return {
        "instance_id": f"enemy_{uuid.uuid4().hex[:10]}",
        "template_id": template_id,
        "name": tpl["name"],
        "level": tpl["level"],
        "max_hp": tpl["maxHp"],
        "current_hp": tpl["maxHp"],
        "attack": tpl["attack"],
        "defense": tpl["defense"],
        "speed": tpl.get("speed", 1.0),
        "aggro_range": tpl["aggroRange"],
        "attack_range": tpl["attackRange"],
        "respawn_seconds": tpl["respawnSeconds"],
        "rewards": dict(tpl["rewards"]),
        "color": tpl.get("color", "#7B3FF2"),
        "tx": tx,
        "ty": ty,
        "spawn_tx": tx,
        "spawn_ty": ty,
        "room_id": room_id,
        "is_dead": False,
        "target_user_id": None,
        "last_attack_at": 0.0,
        "attackers": set(),
    }


def ensure_room_enemies(room_id: str) -> None:
    if not is_combat_room(room_id):
        return
    if _room_enemies.get(room_id):
        return
    _room_enemies[room_id] = {}
    for template_id, tx, ty in COMBAT_ROOM_SPAWNS.get(room_id, []):
        inst = _new_enemy_instance(template_id, room_id, tx, ty)
        _room_enemies[room_id][inst["instance_id"]] = inst


def get_room_enemies_public(room_id: str) -> list:
    if room_id not in _room_enemies:
        return []
    return [public_enemy(e) for e in _room_enemies[room_id].values() if not e.get("is_dead")]


def get_combat_state_payload(room_id: str, user_id: str) -> dict:
    pc = _player_combat.get(user_id)
    return {
        "roomId": room_id,
        "enemies": get_room_enemies_public(room_id),
        "player": public_player_combat(pc) if pc else None,
        "combatActive": is_combat_room(room_id),
    }


async def on_player_enter_combat(user: dict, sid: str, room_id: str) -> None:
    if not is_combat_room(room_id):
        _player_combat.pop(user["user_id"], None)
        return
    ensure_room_enemies(room_id)
    stats = player_combat_stats(user)
    prev = _player_combat.get(user["user_id"])
    _player_combat[user["user_id"]] = {
        "user_id": user["user_id"],
        "sid": sid,
        "room_id": room_id,
        "username": user.get("username"),
        "class_id": stats["class_id"],
        "level": stats["level"],
        "max_hp": stats["maxHp"],
        "hp": prev["hp"] if prev and prev.get("hp", 0) > 0 and not prev.get("is_dead") else stats["maxHp"],
        "attack": stats["attack"],
        "defense": stats["defense"],
        "target_id": None,
        "is_dead": False,
        "last_attack_at": 0.0,
        "respawn_at": 0.0,
    }


def on_player_leave_combat(user_id: str) -> None:
    st = _player_combat.get(user_id)
    if st:
        st["target_id"] = None
        st["sid"] = None


async def _emit_room(room_id: str, event: str, payload: dict, skip_sid: str = None) -> None:
    if _sio is None or not _get_players_in_room:
        return
    for sid in _get_players_in_room(room_id):
        if skip_sid and sid == skip_sid:
            continue
        try:
            await _sio.emit(event, payload, to=sid)
        except Exception as e:
            logger.warning("combat emit %s failed: %s", event, e)


def _check_rate_limit(sid: str, max_per_sec: int = 5) -> bool:
    now = time.time()
    hits = _rate_limit.setdefault(sid, [])
    hits[:] = [t for t in hits if now - t < 1.0]
    if len(hits) >= max_per_sec:
        return False
    hits.append(now)
    return True


async def _grant_kill_rewards(user_id: str, enemy: dict) -> dict:
    rewards = enemy.get("rewards") or {}
    xp = int(rewards.get("xp") or 0)
    aether = int(rewards.get("aether") or 0)
    out = {"xp": xp, "aether": aether, "resource": None}

    grant_xp = _hooks.get("grant_xp")
    grant_aether = _hooks.get("grant_aether")
    give_relic = _hooks.get("_give_relic")
    progress_quests = _hooks.get("progress_quests")

    if grant_xp and xp:
        await grant_xp(user_id, xp, "combat_kill")
    if grant_aether and aether:
        await grant_aether(user_id, aether, f"Combat : {enemy['name']}")

    res = rewards.get("resource")
    if res:
        chance = int(float(res.get("chance", 0)) * 100)
        if secrets.randbelow(100) < chance:
            name = res["name"]
            qty = int(res.get("qty") or 1)
            grant_craft = _hooks.get("grant_craft_resource")
            if grant_craft:
                await grant_craft(user_id, name, qty)
            elif give_relic:
                await give_relic(user_id, {
                    "name": name,
                    "type": "material",
                    "rarity": "rare",
                    "icon": "Sparkles",
                    "quantity": qty,
                })
            out["resource"] = name

    bonus = rewards.get("bonus_resource")
    if bonus:
        chance = int(float(bonus.get("chance", 0)) * 100)
        if secrets.randbelow(100) < chance:
            name = bonus["name"]
            qty = int(bonus.get("qty") or 1)
            grant_craft = _hooks.get("grant_craft_resource")
            if grant_craft:
                await grant_craft(user_id, name, qty)
            elif give_relic:
                await give_relic(user_id, {
                    "name": name,
                    "type": "material",
                    "rarity": "legendary",
                    "icon": "Heart",
                    "quantity": qty,
                })
            out["bonus_resource"] = name

    if progress_quests:
        await progress_quests(user_id, "combat_kill", 1)

    if _db is not None:
        try:
            await _db.combat_kills.insert_one({
                "kill_id": f"kill_{uuid.uuid4().hex[:12]}",
                "user_id": user_id,
                "enemy_template_id": enemy["template_id"],
                "enemy_name": enemy["name"],
                "room_id": enemy["room_id"],
                "xp": xp,
                "aether": aether,
                "resource": out.get("resource"),
                "created_at": _now_iso(),
            })
        except Exception as e:
            logger.warning("combat_kills insert failed: %s", e)

    return out


async def _schedule_enemy_respawn(room_id: str, template_id: str, tx: int, ty: int, delay: int) -> None:
    await asyncio.sleep(delay)
    inst = _new_enemy_instance(template_id, room_id, tx, ty)
    _room_enemies.setdefault(room_id, {})[inst["instance_id"]] = inst
    await _emit_room(room_id, "combat:enemy_spawned", public_enemy(inst))


async def _handle_enemy_death(room_id: str, enemy: dict) -> None:
    enemy["is_dead"] = True
    enemy["current_hp"] = 0
    instance_id = enemy["instance_id"]
    await _emit_room(room_id, "combat:enemy_dead", {"instanceId": instance_id, "roomId": room_id})
    attackers = list(enemy.get("attackers") or [])
    for uid in attackers:
        reward = await _grant_kill_rewards(uid, enemy)
        await _emit_to_user(uid, "combat:reward", {"enemyName": enemy["name"], "reward": reward})
    tpl_id = enemy["template_id"]
    stx, sty = enemy["spawn_tx"], enemy["spawn_ty"]
    delay = int(enemy.get("respawn_seconds") or 30)
    if room_id in _room_enemies:
        _room_enemies[room_id].pop(instance_id, None)
    asyncio.create_task(_schedule_enemy_respawn(room_id, tpl_id, stx, sty, delay))


async def _emit_to_user(user_id: str, event: str, payload: dict) -> None:
    st = _player_combat.get(user_id)
    if st and st.get("sid") and _sio:
        try:
            await _sio.emit(event, payload, to=st["sid"])
        except Exception:
            pass


async def _player_attack(sid: str, data: dict) -> None:
    p = _get_player_by_sid(sid) if _get_player_by_sid else None
    if not p:
        return
    if not _check_rate_limit(sid):
        return

    user_id = p["user_id"]
    room_id = p["room"]
    if not is_combat_room(room_id):
        return

    pc = _player_combat.get(user_id)
    if not pc or pc.get("is_dead"):
        await _sio.emit("system_msg", {"kind": "error", "text": "Vous ne pouvez pas combattre."}, to=sid)
        return

    now = time.time()
    class_id = pc.get("class_id") or "explorer"
    mods = CLASS_COMBAT_MODS.get(class_id, CLASS_COMBAT_MODS["explorer"])
    cooldown = ATTACK_COOLDOWN_SEC * mods.get("cooldown_mult", 1.0)
    if now - pc.get("last_attack_at", 0) < cooldown:
        return

    target_id = (data or {}).get("targetId") or pc.get("target_id")
    if not target_id:
        await _sio.emit("system_msg", {"kind": "info", "text": "Sélectionnez un ennemi."}, to=sid)
        return

    enemies = _room_enemies.get(room_id, {})
    enemy = enemies.get(target_id)
    if not enemy or enemy.get("is_dead") or enemy["current_hp"] <= 0:
        return

    dist = tile_distance(p["tx"], p["ty"], enemy["tx"], enemy["ty"])
    if dist > PLAYER_ATTACK_RANGE_TILES:
        await _sio.emit("system_msg", {"kind": "info", "text": "Approchez-vous de la cible."}, to=sid)
        return

    pc["last_attack_at"] = now
    pc["target_id"] = target_id
    enemy["attackers"].add(user_id)

    result = roll_damage(pc["attack"], enemy["defense"], class_id)
    dmg = result["damage"]
    enemy["current_hp"] = max(0, enemy["current_hp"] - dmg)

    heal_pct = mods.get("heal_on_hit_pct")
    if heal_pct:
        pc["hp"] = min(pc["max_hp"], pc["hp"] + max(1, int(pc["max_hp"] * heal_pct)))
    ls = mods.get("lifesteal_pct")
    if ls:
        pc["hp"] = min(pc["max_hp"], pc["hp"] + max(1, int(dmg * ls)))

    await _emit_room(room_id, "combat:enemy_damaged", {
        "instanceId": target_id,
        "damage": dmg,
        "critical": result["critical"],
        "currentHp": enemy["current_hp"],
        "maxHp": enemy["max_hp"],
        "attackerId": user_id,
        "tx": enemy["tx"],
        "ty": enemy["ty"],
    })
    await _emit_to_user(user_id, "combat:state", get_combat_state_payload(room_id, user_id))

    if enemy["current_hp"] <= 0:
        await _handle_enemy_death(room_id, enemy)


async def _player_target(sid: str, data: dict) -> None:
    p = _get_player_by_sid(sid) if _get_player_by_sid else None
    if not p:
        return
    user_id = p["user_id"]
    room_id = p["room"]
    if not is_combat_room(room_id):
        return
    pc = _player_combat.get(user_id)
    if not pc or pc.get("is_dead"):
        return

    target_id = (data or {}).get("targetId")
    if target_id:
        enemy = _room_enemies.get(room_id, {}).get(target_id)
        if not enemy or enemy.get("is_dead"):
            return
    pc["target_id"] = target_id
    await _sio.emit("combat:state", get_combat_state_payload(room_id, user_id), to=sid)


async def _player_respawn(sid: str) -> None:
    p = _get_player_by_sid(sid) if _get_player_by_sid else None
    if not p:
        return
    user_id = p["user_id"]
    pc = _player_combat.get(user_id)
    if not pc or not pc.get("is_dead"):
        return
    now = time.time()
    if pc.get("respawn_at") and now < pc["respawn_at"]:
        return

    from nexus_rooms import ROOMS
    spawn = ROOMS.get(p["room"], {}).get("spawn", {"tx": p["tx"], "ty": p["ty"]})
    p["tx"] = spawn["tx"]
    p["ty"] = spawn["ty"]
    pc["hp"] = pc["max_hp"]
    pc["is_dead"] = False
    pc["target_id"] = None
    pc["respawn_at"] = 0

    await _emit_room(p["room"], "combat:player_respawned", {
        "userId": user_id,
        "sid": sid,
        "tx": p["tx"],
        "ty": p["ty"],
        "hp": pc["hp"],
        "maxHp": pc["max_hp"],
    })
    await _emit_room(p["room"], "player_move", {
        "sid": sid,
        "tx": p["tx"],
        "ty": p["ty"],
        "teleport": True,
    })
    await _sio.emit("combat:state", get_combat_state_payload(p["room"], user_id), to=sid)


async def _enemy_attack_player(enemy: dict, target_user_id: str, room_id: str) -> None:
    pc = _player_combat.get(target_user_id)
    if not pc or pc.get("is_dead"):
        return
    p = _get_player_by_sid(pc["sid"]) if _get_player_by_sid and pc.get("sid") else None
    if not p or p["room"] != room_id:
        return

    now = time.time()
    if now - enemy.get("last_attack_at", 0) < ENEMY_ATTACK_COOLDOWN_SEC:
        return
    if tile_distance(p["tx"], p["ty"], enemy["tx"], enemy["ty"]) > enemy["attack_range"]:
        return

    enemy["last_attack_at"] = now
    result = roll_damage(enemy["attack"], pc["defense"], "explorer")
    dmg = result["damage"]
    pc["hp"] = max(0, pc["hp"] - dmg)

    await _emit_room(room_id, "combat:player_damaged", {
        "userId": target_user_id,
        "sid": pc.get("sid"),
        "damage": dmg,
        "hp": pc["hp"],
        "maxHp": pc["max_hp"],
        "enemyName": enemy["name"],
    })

    if pc["hp"] <= 0:
        pc["is_dead"] = True
        pc["respawn_at"] = time.time() + RESPAWN_PLAYER_SEC
        pc["target_id"] = None
        await _emit_room(room_id, "combat:player_dead", {
            "userId": target_user_id,
            "sid": pc.get("sid"),
            "respawnIn": RESPAWN_PLAYER_SEC,
        })
        asyncio.create_task(_auto_respawn_player(target_user_id, pc.get("sid")))


async def _auto_respawn_player(user_id: str, sid: str) -> None:
    await asyncio.sleep(RESPAWN_PLAYER_SEC)
    if sid and _get_player_by_sid:
        p = _get_player_by_sid(sid)
        if p and p["user_id"] == user_id:
            await _player_respawn(sid)


def _ai_step_toward(ex: int, ey: int, px: int, py: int) -> tuple:
    dx = px - ex
    dy = py - ey
    if dx == 0 and dy == 0:
        return ex, ey
    step_x = 1 if dx > 0 else (-1 if dx < 0 else 0)
    step_y = 1 if dy > 0 else (-1 if dy < 0 else 0)
    if abs(dx) >= abs(dy):
        return ex + step_x, ey
    return ex, ey + step_y


async def _ai_tick_once() -> None:
    if not _get_players_in_room or not _get_player_by_sid:
        return
    for room_id in list(COMBAT_ROOMS):
        ensure_room_enemies(room_id)
        enemies = _room_enemies.get(room_id, {})
        room_players = []
        for sid in _get_players_in_room(room_id):
            pl = _get_player_by_sid(sid)
            if pl:
                pc = _player_combat.get(pl["user_id"])
                if pc and not pc.get("is_dead"):
                    room_players.append((pl, pc))

        for enemy in list(enemies.values()):
            if enemy.get("is_dead") or enemy["current_hp"] <= 0:
                continue

            if tile_distance(enemy["tx"], enemy["ty"], enemy["spawn_tx"], enemy["spawn_ty"]) > LEASH_RANGE_TILES:
                enemy["tx"], enemy["ty"] = enemy["spawn_tx"], enemy["spawn_ty"]
                enemy["target_user_id"] = None
                await _emit_room(room_id, "combat:enemy_updated", public_enemy(enemy))
                continue

            target_pl = None
            target_uid = enemy.get("target_user_id")
            if target_uid:
                for pl, _pc in room_players:
                    if pl["user_id"] == target_uid:
                        target_pl = pl
                        break

            if not target_pl:
                best_d = 999
                for pl, _pc in room_players:
                    d = tile_distance(enemy["tx"], enemy["ty"], pl["tx"], pl["ty"])
                    if d <= enemy["aggro_range"] and d < best_d:
                        best_d = d
                        target_pl = pl
                        target_uid = pl["user_id"]
                enemy["target_user_id"] = target_uid

            if not target_pl:
                if enemy["tx"] != enemy["spawn_tx"] or enemy["ty"] != enemy["spawn_ty"]:
                    enemy["tx"], enemy["ty"] = _ai_step_toward(
                        enemy["tx"], enemy["ty"], enemy["spawn_tx"], enemy["spawn_ty"],
                    )
                    await _emit_room(room_id, "combat:enemy_updated", public_enemy(enemy))
                continue

            dist = tile_distance(enemy["tx"], enemy["ty"], target_pl["tx"], target_pl["ty"])
            if dist > enemy["aggro_range"] * 1.5:
                enemy["target_user_id"] = None
                continue

            if dist <= enemy["attack_range"]:
                await _enemy_attack_player(enemy, target_uid, room_id)
            else:
                ntx, nty = _ai_step_toward(enemy["tx"], enemy["ty"], target_pl["tx"], target_pl["ty"])
                if ntx != enemy["tx"] or nty != enemy["ty"]:
                    enemy["tx"], enemy["ty"] = ntx, nty
                    await _emit_room(room_id, "combat:enemy_updated", public_enemy(enemy))


async def _ai_loop() -> None:
    while True:
        try:
            await _ai_tick_once()
        except Exception as e:
            logger.warning("combat AI tick error: %s", e)
        await asyncio.sleep(AI_TICK_MS / 1000.0)


def start_ai_loop() -> None:
    global _ai_task
    if _ai_task is None:
        _ai_task = asyncio.create_task(_ai_loop())


def register_socket_handlers(
    sio,
    db,
    hooks: dict,
    get_player_by_sid: Callable,
    get_players_in_room: Callable,
) -> None:
    global _sio, _db, _hooks, _get_player_by_sid, _get_players_in_room
    _sio = sio
    _db = db
    _hooks = hooks or {}
    _get_player_by_sid = get_player_by_sid
    _get_players_in_room = get_players_in_room

    @sio.on("combat:target")
    async def combat_target(sid, data):
        await _player_target(sid, data or {})

    @sio.on("combat:attack")
    async def combat_attack(sid, data=None):
        await _player_attack(sid, data or {})

    @sio.on("combat:respawn")
    async def combat_respawn(sid, data=None):
        await _player_respawn(sid)

    @sio.on("combat:request_state")
    async def combat_request_state(sid, data=None):
        p = get_player_by_sid(sid)
        if not p or not is_combat_room(p["room"]):
            return
        await on_player_enter_combat(
            {
                "user_id": p["user_id"],
                "username": p.get("username"),
                "level": p.get("level"),
                "class_id": p.get("class_id"),
            },
            sid,
            p["room"],
        )
        await sio.emit("combat:state", get_combat_state_payload(p["room"], p["user_id"]), to=sid)

    start_ai_loop()


async def get_player_state(db, user_id: str) -> dict:
    pc = _player_combat.get(user_id)
    if not pc:
        user = await db.users.find_one({"user_id": user_id}, {"level": 1, "class_id": 1, "_id": 0})
        stats = player_combat_stats(user or {})
        return {
            "combatActive": False,
            "hp": stats["maxHp"],
            "maxHp": stats["maxHp"],
            "isDead": False,
            "stats": stats,
        }
    return {
        "combatActive": True,
        "hp": pc["hp"],
        "maxHp": pc["max_hp"],
        "isDead": pc.get("is_dead", False),
        "targetId": pc.get("target_id"),
        "stats": {
            "attack": pc["attack"],
            "defense": pc["defense"],
            "class_id": pc.get("class_id"),
            "level": pc.get("level"),
        },
    }
