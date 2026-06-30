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

AVATAR_CY = 138
AVATAR_RADIUS = 68
RING_WIDTH = 5

GOLD = (235, 198, 120)
GOLD_DARK = (180, 140, 70)
SUBTITLE_COLOR = (196, 178, 220)
PANEL_TOP = 208
PANEL_BOTTOM = 408

GOLD_GRADIENT = (
    (255, 236, 180),
    (235, 198, 120),
    (190, 150, 75),
)


def display_name(user: dict[str, Any]) -> str:
    return str(
        user.get("global_name")
        or user.get("username")
        or "Aventurier"
    ).strip() or "Aventurier"


def welcome_headline() -> str:
    lang = os.environ.get("DISCORD_WELCOME_CARD_LANG", "fr").strip().lower()
    return "BIENVENUE" if lang.startswith("fr") else "WELCOME"


def welcome_subtitle() -> str:
    return (
        os.environ.get("DISCORD_WELCOME_SUBTITLE", "Un nouveau héros rejoint le royaume").strip()
        or "Un nouveau héros rejoint le royaume"
    )


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
        paths = [
            "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf",
            "C:/Windows/Fonts/georgia.ttf",
            *paths,
        ]
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
        color = (int(12 + 30 * t), int(8 + 8 * t), int(22 + 40 * t), 255)
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
    outer = radius + RING_WIDTH + 4
    for i in range(RING_WIDTH + 2):
        t = i / max(RING_WIDTH + 1, 1)
        color = (
            int(GOLD_GRADIENT[0][0] * (1 - t) + GOLD_GRADIENT[2][0] * t),
            int(GOLD_GRADIENT[0][1] * (1 - t) + GOLD_GRADIENT[2][1] * t),
            int(GOLD_GRADIENT[0][2] * (1 - t) + GOLD_GRADIENT[2][2] * t),
            255,
        )
        draw.ellipse(
            (cx - outer + i, cy - outer + i, cx + outer - i, cy + outer - i),
            outline=color,
            width=2,
        )
    glow = Image.new("RGBA", base.size, (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    gdraw.ellipse(
        (cx - radius - 8, cy - radius - 8, cx + radius + 8, cy + radius + 8),
        fill=(140, 90, 220, 45),
    )
    glow = glow.filter(ImageFilter.GaussianBlur(radius=6))
    base.alpha_composite(glow)


def _draw_text_panel(base: Image.Image) -> None:
    """Voile opaque sur la zone texte du template (masque WELCOME / NEW HERO)."""
    overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    x0, x1 = int(CARD_WIDTH * 0.05), int(CARD_WIDTH * 0.95)
    y0, y1 = PANEL_TOP, PANEL_BOTTOM
    core_top, core_bottom = y0 + 18, y1 - 18

    draw.rectangle((x0, core_top, x1, core_bottom), fill=(10, 6, 20, 252))

    for y in range(y0, core_top):
        t = (y - y0) / max(core_top - y0, 1)
        alpha = int(252 * t)
        draw.line([(x0, y), (x1, y)], fill=(10, 6, 20, alpha))
    for y in range(core_bottom, y1):
        t = 1 - (y - core_bottom) / max(y1 - core_bottom, 1)
        alpha = int(252 * t)
        draw.line([(x0, y), (x1, y)], fill=(10, 6, 20, alpha))

    base.alpha_composite(overlay)


def _truncate_to_width(draw: ImageDraw.ImageDraw, text: str, font, max_width: int) -> str:
    if draw.textlength(text, font=font) <= max_width:
        return text
    ell = "…"
    while text and draw.textlength(text + ell, font=font) > max_width:
        text = text[:-1]
    return (text + ell) if text else ell


def _auto_font_size(
    draw: ImageDraw.ImageDraw,
    text: str,
    max_width: int,
    start: int,
    *,
    bold: bool = True,
) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    size = start
    while size > 18:
        font = _font(size, bold=bold)
        if draw.textlength(text, font=font) <= max_width:
            return font
        size -= 2
    return _font(18, bold=bold)


def _draw_gold_text(
    draw: ImageDraw.ImageDraw,
    text: str,
    y: int,
    font,
    max_width: int,
) -> None:
    text = _truncate_to_width(draw, text, font, max_width)
    tw = draw.textlength(text, font=font)
    x = int((CARD_WIDTH - tw) / 2)
    draw.text((x + 2, y + 2), text, font=font, fill=(0, 0, 0, 180))
    draw.text((x + 1, y + 1), text, font=font, fill=(*GOLD_DARK, 255))
    draw.text((x, y), text, font=font, fill=(*GOLD, 255))


def _draw_centered_text(
    draw: ImageDraw.ImageDraw,
    text: str,
    y: int,
    font,
    fill: tuple[int, ...],
    max_width: int,
) -> None:
    text = _truncate_to_width(draw, text, font, max_width)
    tw = draw.textlength(text, font=font)
    x = int((CARD_WIDTH - tw) / 2)
    draw.text((x + 1, y + 1), text, font=font, fill=(0, 0, 0, 140))
    draw.text((x, y), text, font=font, fill=fill)


def render_welcome_card(user: dict[str, Any], avatar: Image.Image) -> Image.Image:
    """Compose la bannière PNG (RGB) prête pour Discord."""
    base = _load_base()
    cx = CARD_WIDTH // 2
    cy = AVATAR_CY
    r = AVATAR_RADIUS
    size = r * 2

    _draw_text_panel(base)

    av = _circular_avatar(avatar, size)
    base.paste(av, (cx - r, cy - r), av)
    _draw_gold_ring(base, cx, cy, r)

    draw = ImageDraw.Draw(base)
    name = display_name(user)
    max_w = CARD_WIDTH - 140

    headline_font = _auto_font_size(draw, welcome_headline(), max_w, 44)
    name_font = _auto_font_size(draw, name, max_w, 62)
    sub_font = _font(22, bold=False)

    _draw_gold_text(draw, welcome_headline(), 228, headline_font, max_w)
    _draw_gold_text(draw, name, 292, name_font, max_w)
    _draw_centered_text(
        draw,
        welcome_subtitle(),
        362,
        sub_font,
        (*SUBTITLE_COLOR, 255),
        max_w,
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
