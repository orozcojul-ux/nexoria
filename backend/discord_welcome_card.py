"""Génération de welcome cards Discord (Pillow) — style NEXORIA dark fantasy."""
from __future__ import annotations

import io
import logging
import os
import tempfile
from pathlib import Path
from typing import Any

import httpx
from PIL import Image, ImageDraw, ImageFilter, ImageFont

logger = logging.getLogger("nexoria.discord_welcome_card")

ASSETS_DIR = Path(__file__).resolve().parent / "assets" / "discord"
TEMPLATE_PATH = ASSETS_DIR / "welcome_template.png"

CARD_WIDTH = 1200
CARD_HEIGHT = 480

# Positions calibrées sur welcome_template.png (1200×480)
AVATAR_CY = 155
AVATAR_RADIUS = 72
RING_WIDTH = 5
NAME_Y = 312
SUBTITLE_Y = 348
COVER_BAND = (200, 306, 1000, 334)  # masque la zone « NEW HERO »

GOLD = (212, 175, 90)
GOLD_LIGHT = (255, 228, 160)
SUBTITLE_COLOR = (180, 160, 210)


def display_name(user: dict[str, Any]) -> str:
    return str(
        user.get("global_name")
        or user.get("username")
        or "Aventurier"
    ).strip() or "Aventurier"


def _font(size: int, *, bold: bool = True) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    if os.name == "nt":
        paths = [
            "C:/Windows/Fonts/georgiab.ttf",
            "C:/Windows/Fonts/timesbd.ttf",
            "C:/Windows/Fonts/arialbd.ttf",
        ]
    else:
        paths = [
            "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        ]
    if not bold:
        paths = [p.replace("-Bold", "").replace("b.ttf", ".ttf") for p in paths]
    for path in paths:
        if Path(path).is_file():
            try:
                return ImageFont.truetype(path, size)
            except OSError:
                continue
    return ImageFont.load_default()


def _procedural_background(w: int, h: int) -> Image.Image:
    base = Image.new("RGBA", (w, h), (12, 8, 22, 255))
    draw = ImageDraw.Draw(base)
    for y in range(h):
        t = y / max(h - 1, 1)
        color = (
            int(12 + 30 * t),
            int(8 + 8 * t),
            int(22 + 40 * t),
            255,
        )
        draw.line([(0, y), (w, y)], fill=color)
    return base


def _load_base() -> Image.Image:
    if TEMPLATE_PATH.is_file():
        img = Image.open(TEMPLATE_PATH).convert("RGBA")
        if img.size != (CARD_WIDTH, CARD_HEIGHT):
            img = img.resize((CARD_WIDTH, CARD_HEIGHT), Image.Resampling.LANCZOS)
        return img
    return _procedural_background(CARD_WIDTH, CARD_HEIGHT)


async def fetch_avatar_image(client: httpx.AsyncClient, url: str) -> Image.Image:
    r = await client.get(url, timeout=20.0, follow_redirects=True)
    r.raise_for_status()
    return Image.open(io.BytesIO(r.content)).convert("RGBA")


def _circular_avatar(avatar: Image.Image, size: int) -> Image.Image:
    avatar = avatar.resize((size, size), Image.Resampling.LANCZOS)
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size - 1, size - 1), fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(avatar, (0, 0), mask)
    return out


def _draw_gold_ring(base: Image.Image, cx: int, cy: int, radius: int) -> None:
    draw = ImageDraw.Draw(base)
    outer = radius + RING_WIDTH + 3
    for i in range(RING_WIDTH):
        t = i / max(RING_WIDTH - 1, 1)
        color = (
            int(GOLD_LIGHT[0] * (1 - t) + GOLD[0] * t),
            int(GOLD_LIGHT[1] * (1 - t) + GOLD[1] * t),
            int(GOLD_LIGHT[2] * (1 - t) + GOLD[2] * t),
            255,
        )
        draw.ellipse(
            (cx - outer + i, cy - outer + i, cx + outer - i, cy + outer - i),
            outline=color,
            width=2,
        )
    for dx, dy in ((0, -1), (0, 1), (-1, 0), (1, 0)):
        px = cx + dx * (radius + RING_WIDTH + 6)
        py = cy + dy * (radius + RING_WIDTH + 6)
        draw.polygon(
            [(px, py - 5), (px + 5, py), (px, py + 5), (px - 5, py)],
            fill=GOLD_LIGHT,
        )


def _cover_band(base: Image.Image, box: tuple[int, int, int, int]) -> None:
    x0, y0, x1, y1 = box
    sample = base.crop((x0, max(0, y0 - 24), x1, y0))
    if sample.height < 4:
        return
    patch = sample.resize((x1 - x0, y1 - y0), Image.Resampling.LANCZOS)
    patch = patch.filter(ImageFilter.GaussianBlur(radius=1.5))
    base.paste(patch, (x0, y0))


def _truncate_to_width(draw: ImageDraw.ImageDraw, text: str, font, max_width: int) -> str:
    if draw.textlength(text, font=font) <= max_width:
        return text
    ell = "…"
    while text and draw.textlength(text + ell, font=font) > max_width:
        text = text[:-1]
    return (text + ell) if text else ell


def _draw_centered_text(
    draw: ImageDraw.ImageDraw,
    text: str,
    y: int,
    font,
    fill: tuple[int, ...],
    max_width: int,
    shadow: bool = True,
) -> None:
    text = _truncate_to_width(draw, text, font, max_width)
    w = CARD_WIDTH
    tw = draw.textlength(text, font=font)
    x = int((w - tw) / 2)
    if shadow:
        draw.text((x + 2, y + 2), text, font=font, fill=(0, 0, 0, 160))
    draw.text((x, y), text, font=font, fill=fill)


def render_welcome_card(user: dict[str, Any], avatar: Image.Image) -> Image.Image:
    """Compose la bannière PNG (RGB) prête pour Discord."""
    base = _load_base()
    cx = CARD_WIDTH // 2
    cy = AVATAR_CY
    r = AVATAR_RADIUS
    size = r * 2

    av = _circular_avatar(avatar, size)
    base.paste(av, (cx - r, cy - r), av)
    _draw_gold_ring(base, cx, cy, r)
    _cover_band(base, COVER_BAND)

    draw = ImageDraw.Draw(base)
    name = display_name(user)
    name_font = _font(42)
    sub_font = _font(22, bold=False)
    subtitle = os.environ.get(
        "DISCORD_WELCOME_SUBTITLE",
        "Un nouveau héros rejoint le royaume",
    ).strip() or "Un nouveau héros rejoint le royaume"

    _draw_centered_text(draw, name, NAME_Y, name_font, (*GOLD, 255), CARD_WIDTH - 120)
    _draw_centered_text(
        draw, subtitle, SUBTITLE_Y, sub_font, (*SUBTITLE_COLOR, 255), CARD_WIDTH - 80, shadow=False,
    )

    return base.convert("RGB")


async def generate_welcome_card_bytes(user: dict[str, Any], avatar_url: str) -> bytes | None:
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            avatar = await fetch_avatar_image(client, avatar_url)
        card = render_welcome_card(user, avatar)
        buf = io.BytesIO()
        card.save(buf, format="PNG", optimize=True)
        return buf.getvalue()
    except Exception as exc:  # noqa: BLE001
        logger.warning("welcome card generation failed: %s", str(exc)[:240])
        return None


async def generate_welcome_card_file(
    user: dict[str, Any],
    avatar_url: str,
) -> tuple[str | None, str | None]:
    """Retourne (chemin_temp, nom_fichier) — le caller doit supprimer le fichier."""
    data = await generate_welcome_card_bytes(user, avatar_url)
    if not data:
        return None, None
    fd, path = tempfile.mkstemp(suffix=".png", prefix="nexoria_welcome_")
    os.close(fd)
    try:
        Path(path).write_bytes(data)
        safe = "".join(c if c.isalnum() or c in "-_" else "_" for c in display_name(user))[:40]
        return path, f"welcome-{safe or 'hero'}.png"
    except Exception:
        Path(path).unlink(missing_ok=True)
        raise


def cleanup_temp_file(path: str | None) -> None:
    if not path:
        return
    try:
        Path(path).unlink(missing_ok=True)
    except OSError:
        pass
