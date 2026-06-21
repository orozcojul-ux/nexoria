"""Commandes slash du tchat Nexus Online (/kick, /clearchat, /color, …)."""

from __future__ import annotations

import re
from typing import Any, Callable, Awaitable

import nexus_room_chat as room_chat

STAFF_ROLES = {"admin", "moderator"}


def is_nexus_staff(player: dict | None) -> bool:
    if not player:
        return False
    return player.get("role") in STAFF_ROLES or bool(player.get("is_nexus_supreme"))

# Couleurs VIP autorisées (hex lowercase)
NEXUS_VIP_CHAT_COLORS = {
    "#f472b6", "#a78bfa", "#34d399", "#60a5fa", "#fbbf24",
    "#fb923c", "#f87171", "#e879f9", "#2dd4bf", "#c084fc",
}

NEXUS_VIP_COLOR_NAMES = {
    "rose": "#f472b6",
    "violet": "#a78bfa",
    "vert": "#34d399",
    "bleu": "#60a5fa",
    "or": "#fbbf24",
    "orange": "#fb923c",
    "rouge": "#f87171",
    "magenta": "#e879f9",
    "cyan": "#2dd4bf",
    "lila": "#c084fc",
}


def resolve_vip_color(raw: str) -> str | None:
    """Retourne un hex autorisé, None pour reset, ou lève ValueError."""
    token = (raw or "").strip().lower()
    if not token or token in ("reset", "default", "off", "none"):
        return None
    if token in NEXUS_VIP_COLOR_NAMES:
        return NEXUS_VIP_COLOR_NAMES[token]
    if token.startswith("#") and re.match(r"^#[0-9a-f]{6}$", token):
        if token not in NEXUS_VIP_CHAT_COLORS:
            raise ValueError("Couleur non autorisée.")
        return token
    raise ValueError("Couleur invalide. Ex: /color rose ou /color #f472b6")


def _split_command(text: str) -> tuple[str, list[str]]:
    parts = text.strip().split()
    if not parts:
        return "", []
    return parts[0].lower(), parts[1:]


async def handle_slash_command(
    *,
    sid: str,
    player: dict,
    text: str,
    sio: Any,
    db: Any,
    players: dict,
    chat_buffer: dict,
    rooms: dict,
    find_by_username: Callable[[str, str | None], dict | None],
    kick_player: Callable[[dict, str, dict], Awaitable[None]],
    audit: Callable[[str, dict, dict | None, dict], Awaitable[None]] | None,
    vip_active: Callable[[dict], bool],
) -> bool:
    """True si la commande a été traitée (ne pas envoyer comme message normal)."""
    if not text.startswith("/"):
        return False

    cmd_raw, args = _split_command(text)
    cmd = cmd_raw.lstrip("/")
    is_staff = player.get("role") in STAFF_ROLES

    async def ok(msg: str):
        await sio.emit("system_msg", {"kind": "ok", "text": msg}, to=sid)

    async def err(msg: str):
        await sio.emit("system_msg", {"kind": "error", "text": msg}, to=sid)

    async def info(msg: str):
        await sio.emit("system_msg", {"kind": "info", "text": msg}, to=sid)

    # ---- /help ----
    if cmd in ("help", "aide", "?"):
        await sio.emit("nexus_chat_help", {
            "is_staff": is_staff,
            "is_vip": vip_active(player),
        }, to=sid)
        return True

    # ---- /color (VIP) ----
    if cmd in ("color", "couleur"):
        if is_nexus_staff(player):
            await err(
                "Gardien du Nexus : votre couleur de tchat est fixée à celle de votre grade "
                "(Sage, Sentinelle ou Gardien Suprême). La personnalisation VIP (/color) est impossible pour le staff."
            )
            return True
        if not vip_active(player):
            await err("Couleur de tchat réservée aux membres VIP.")
            return True
        if not args:
            presets = ", ".join(NEXUS_VIP_COLOR_NAMES.keys())
            await info(f"Usage : /color <{presets}|#hex|reset>")
            return True
        try:
            color = resolve_vip_color(args[0])
        except ValueError as e:
            await err(str(e))
            return True
        if db is not None:
            if color is None:
                await db.users.update_one(
                    {"user_id": player["user_id"]},
                    {"$unset": {"nexus_chat_color": ""}},
                )
            else:
                await db.users.update_one(
                    {"user_id": player["user_id"]},
                    {"$set": {"nexus_chat_color": color}},
                )
        player["nexus_chat_color"] = color
        await sio.emit("player_profile", {
            "sid": sid,
            "user_id": player["user_id"],
            "nexus_chat_color": color,
            "chat_color": color,
        }, to=player["room"])
        await ok("Couleur de tchat réinitialisée." if color is None else f"Couleur de tchat : {color}")
        return True

    if not is_staff:
        await err("Commande inconnue. Tape /help")
        return True

    room_id = player["room"]

    # ---- /kick ----
    if cmd == "kick":
        if not args:
            await err("Usage : /kick <pseudo> [raison]")
            return True
        target = find_by_username(args[0], room_id)
        if not target:
            await err("Joueur introuvable dans cette salle.")
            return True
        if target["role"] in STAFF_ROLES and target["user_id"] != player["user_id"]:
            await err("Impossible d'expulser un Gardien.")
            return True
        reason = " ".join(args[1:]).strip()[:120] or "Expulsé par un Gardien."
        await kick_player(target, reason, player)
        await ok(f"{target['username']} expulsé.")
        if audit:
            await audit("kick_chat", player, target, {"reason": reason})
        return True

    # ---- /kickall ----
    if cmd == "kickall":
        reason = " ".join(args).strip()[:120] or "Expulsion de masse par un Gardien."
        kicked = 0
        for other in list(players.values()):
            if other["room"] != room_id:
                continue
            if other["user_id"] == player["user_id"]:
                continue
            if other["role"] in STAFF_ROLES:
                continue
            await kick_player(other, reason, player)
            kicked += 1
        room_name = rooms.get(room_id, {}).get("name", room_id)
        await sio.emit("system_msg", {
            "kind": "warn",
            "text": f"Un Gardien a expulsé les voyageurs de {room_name}.",
        }, to=room_id)
        await ok(f"{kicked} joueur(s) expulsé(s).")
        if audit:
            await audit("kickall_chat", player, None, {"room": room_id, "count": kicked, "reason": reason})
        return True

    # ---- /clearchat / /clean ----
    if cmd in ("clearchat", "clean", "nettoyer"):
        count = await room_chat.clear_room_messages(db, room_id, player)
        chat_buffer[room_id] = []
        await sio.emit("room_chat_cleared", {"room_id": room_id}, to=room_id)
        room_name = rooms.get(room_id, {}).get("name", room_id)
        await sio.emit("system_msg", {
            "kind": "info",
            "text": f"Le tchat de {room_name} a été nettoyé par {player['username']}.",
        }, to=room_id)
        await ok(f"Tchat nettoyé ({count} message(s) archivé(s)).")
        if audit:
            await audit("clearchat", player, None, {"room": room_id, "count": count})
        return True

    # ---- /mute ----
    if cmd == "mute":
        if len(args) < 2:
            await err("Usage : /mute <pseudo> <minutes>")
            return True
        try:
            minutes = max(1, min(1440, int(args[-1])))
        except ValueError:
            await err("Durée invalide (minutes).")
            return True
        username = " ".join(args[:-1])
        target = find_by_username(username, None)
        if not target:
            await err("Joueur introuvable (hors-ligne ou pseudo incorrect).")
            return True
        if target["role"] in STAFF_ROLES and target["user_id"] != player["user_id"]:
            await err("Impossible de réduire au silence un Gardien.")
            return True
        until_iso = await room_chat.set_chat_mute(db, target["user_id"], minutes)
        target["muted"] = True
        target["chat_muted_until"] = until_iso
        await sio.emit("room_chat_user_muted", {
            "user_id": target["user_id"],
            "username": target["username"],
            "until": until_iso,
            "by_username": player["username"],
        }, to=target["room"])
        await sio.emit("system_msg", {
            "kind": "muted",
            "text": f"Tu es réduit au silence pour {minutes} min.",
        }, to=target["sid"])
        await ok(f"{target['username']} réduit au silence ({minutes} min).")
        if audit:
            await audit("room_chat_mute", player, target, {"minutes": minutes, "via": "chat"})
        return True

    # ---- /muteall ----
    if cmd == "muteall":
        if not args:
            await err("Usage : /muteall <minutes>")
            return True
        try:
            minutes = max(1, min(1440, int(args[0])))
        except ValueError:
            await err("Durée invalide (minutes).")
            return True
        muted_count = 0
        for other in list(players.values()):
            if other["room"] != room_id:
                continue
            if other["role"] in STAFF_ROLES:
                continue
            if other["user_id"] == player["user_id"]:
                continue
            until_iso = await room_chat.set_chat_mute(db, other["user_id"], minutes)
            other["muted"] = True
            other["chat_muted_until"] = until_iso
            await sio.emit("system_msg", {
                "kind": "muted",
                "text": f"Tu es réduit au silence pour {minutes} min (salle entière).",
            }, to=other["sid"])
            muted_count += 1
        await sio.emit("room_chat_user_muted", {
            "room_id": room_id,
            "bulk": True,
            "minutes": minutes,
            "by_username": player["username"],
        }, to=room_id)
        await ok(f"{muted_count} joueur(s) réduit(s) au silence ({minutes} min).")
        if audit:
            await audit("muteall_chat", player, None, {"room": room_id, "minutes": minutes, "count": muted_count})
        return True

    # ---- /unmute ----
    if cmd == "unmute":
        if not args:
            await err("Usage : /unmute <pseudo>")
            return True
        target = find_by_username(" ".join(args), None)
        if not target:
            await err("Joueur introuvable.")
            return True
        await room_chat.clear_chat_mute(db, target["user_id"])
        target["muted"] = False
        target.pop("chat_muted_until", None)
        await sio.emit("room_chat_user_unmuted", {
            "user_id": target["user_id"],
            "username": target["username"],
        }, to=target["room"])
        await sio.emit("system_msg", {
            "kind": "info",
            "text": "Tu peux de nouveau parler.",
        }, to=target["sid"])
        await ok(f"{target['username']} autorisé à parler.")
        if audit:
            await audit("room_chat_unmute", player, target, {"via": "chat"})
        return True

    # ---- /unmuteall ----
    if cmd == "unmuteall":
        unmuted_count = 0
        for other in list(players.values()):
            if other["room"] != room_id:
                continue
            if other["role"] in STAFF_ROLES:
                continue
            if not other.get("muted") and not other.get("chat_muted_until"):
                continue
            await room_chat.clear_chat_mute(db, other["user_id"])
            other["muted"] = False
            other.pop("chat_muted_until", None)
            await sio.emit("system_msg", {
                "kind": "info",
                "text": "Un Gardien a levé le silence sur la salle.",
            }, to=other["sid"])
            unmuted_count += 1
        await sio.emit("room_chat_user_unmuted", {
            "room_id": room_id,
            "bulk": True,
            "by_username": player["username"],
        }, to=room_id)
        await ok(f"{unmuted_count} joueur(s) peuvent de nouveau parler.")
        if audit:
            await audit("unmuteall_chat", player, None, {"room": room_id, "count": unmuted_count})
        return True

    await err("Commande inconnue. Tape /help")
    return True
