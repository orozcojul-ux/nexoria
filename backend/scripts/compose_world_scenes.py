"""Compose room scenes for NEXORIA using the Fantasy House asset pack.

Each room gets a unique 1280x720 scene built from the provided sprites.
Same style across the world: per-group gradient sky, ground band, layered props.
"""
import os, math, json, random
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

ASSETS = "/app/frontend/public/world/assets"
OUT_DIR = "/app/frontend/public/world/rooms"
THUMB_DIR = "/app/frontend/public/world/thumbs"
os.makedirs(OUT_DIR, exist_ok=True)
os.makedirs(THUMB_DIR, exist_ok=True)

W, H = 1280, 720

# Group color palette (background gradient: top, mid, ground)
PALETTES = {
    "center":     [(28, 16, 70),   (78, 40, 138),  (38, 22, 60)],
    "social":     [(48, 25, 18),   (140, 70, 28),  (52, 28, 16)],
    "combat":     [(52, 12, 16),   (138, 22, 28),  (40, 10, 14)],
    "knowledge":  [(12, 28, 60),   (38, 70, 130),  (12, 22, 46)],
    "mystic":     [(34, 14, 64),   (96, 32, 138),  (28, 10, 50)],
    "adventure":  [(18, 38, 18),   (60, 110, 50),  (16, 30, 14)],
    "restricted": [(10, 6, 32),    (60, 14, 110),  (8, 6, 24)],
}

# Group accent color (used for glow + ambient lights)
ACCENT = {
    "center":     (175, 110, 255),
    "social":     (255, 180, 100),
    "combat":     (255, 90, 70),
    "knowledge":  (110, 180, 255),
    "mystic":     (210, 130, 255),
    "adventure":  (130, 220, 130),
    "restricted": (170, 100, 255),
}


def load(key):
    p = os.path.join(ASSETS, f"{key}.png")
    return Image.open(p).convert("RGBA") if os.path.exists(p) else None


def gradient_bg(palette):
    top, mid, bot = palette
    img = Image.new("RGB", (W, H), top)
    px = img.load()
    for y in range(H):
        if y < H * 0.55:
            t = y / (H * 0.55)
            r = int(top[0] * (1 - t) + mid[0] * t)
            g = int(top[1] * (1 - t) + mid[1] * t)
            b = int(top[2] * (1 - t) + mid[2] * t)
        else:
            t = (y - H * 0.55) / (H * 0.45)
            r = int(mid[0] * (1 - t) + bot[0] * t)
            g = int(mid[1] * (1 - t) + bot[1] * t)
            b = int(mid[2] * (1 - t) + bot[2] * t)
        for x in range(W):
            px[x, y] = (r, g, b)
    return img.convert("RGBA")


def add_starfield(bg, count=120, accent=(255, 255, 255)):
    draw = ImageDraw.Draw(bg)
    rng = random.Random(42)
    for _ in range(count):
        x = rng.randint(0, W)
        y = rng.randint(0, int(H * 0.6))
        r = rng.choice([1, 1, 1, 2, 3])
        alpha = rng.randint(60, 220)
        c = (accent[0], accent[1], accent[2], alpha)
        draw.ellipse([x - r, y - r, x + r, y + r], fill=c)
    return bg


def add_horizon_glow(bg, accent):
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    g = ImageDraw.Draw(glow)
    cx, cy = W // 2, int(H * 0.62)
    for radius in range(420, 60, -40):
        a = int(70 * (1 - radius / 420))
        g.ellipse([cx - radius, cy - radius // 2, cx + radius, cy + radius // 2],
                  fill=(accent[0], accent[1], accent[2], max(0, a)))
    glow = glow.filter(ImageFilter.GaussianBlur(40))
    bg.alpha_composite(glow)
    return bg


def add_ground_band(bg, accent):
    """Soft horizontal floor band."""
    band = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(band)
    for i in range(120):
        a = max(0, 140 - i * 1)
        d.line([(0, H - 120 + i), (W, H - 120 + i)], fill=(10, 4, 18, a), width=1)
    bg.alpha_composite(band)
    # accent strip
    line = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ld = ImageDraw.Draw(line)
    ld.line([(0, H - 122), (W, H - 122)], fill=(accent[0], accent[1], accent[2], 110), width=2)
    line = line.filter(ImageFilter.GaussianBlur(2))
    bg.alpha_composite(line)
    return bg


def fit(sprite, max_w=None, max_h=None):
    if sprite is None:
        return None
    sw, sh = sprite.size
    if max_w and sw > max_w:
        ratio = max_w / sw
        sprite = sprite.resize((int(sw * ratio), int(sh * ratio)), Image.LANCZOS)
        sw, sh = sprite.size
    if max_h and sh > max_h:
        ratio = max_h / sh
        sprite = sprite.resize((int(sw * ratio), int(sh * ratio)), Image.LANCZOS)
    return sprite


def place(bg, sprite, cx, by, max_w=None, max_h=None, opacity=1.0, tint=None):
    """Place sprite centered horizontally on cx, with its bottom on by."""
    if sprite is None:
        return
    s = fit(sprite, max_w=max_w, max_h=max_h)
    if s is None:
        return
    if tint is not None:
        s = colorize(s, tint)
    if opacity < 1.0:
        alpha = s.split()[-1].point(lambda p: int(p * opacity))
        s.putalpha(alpha)
    x = int(cx - s.size[0] / 2)
    y = int(by - s.size[1])
    bg.alpha_composite(s, (x, y))


def colorize(sprite, color):
    """Multiply sprite RGB by color (keeps original alpha)."""
    r, g, b, a = sprite.split()
    cr, cg, cb = color
    nr = r.point(lambda p: min(255, int(p * cr / 255)))
    ng = g.point(lambda p: min(255, int(p * cg / 255)))
    nb = b.point(lambda p: min(255, int(p * cb / 255)))
    return Image.merge("RGBA", (nr, ng, nb, a))


def add_ambient_glow(bg, x, y, radius, color, intensity=1.0):
    g = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(g)
    for r in range(radius, 0, -8):
        a = int(80 * intensity * (1 - r / radius) ** 2)
        d.ellipse([x - r, y - r, x + r, y + r], fill=(color[0], color[1], color[2], a))
    g = g.filter(ImageFilter.GaussianBlur(20))
    bg.alpha_composite(g)


# ============ ROOM RECIPES ============
def compose(room):
    g = room["group"]
    pal = PALETTES.get(g, PALETTES["mystic"])
    accent = ACCENT.get(g, (180, 120, 255))
    bg = gradient_bg(pal)
    add_starfield(bg, count=140, accent=accent)
    add_horizon_glow(bg, accent)

    rid = room["id"]
    # ---- Per-room composition ----
    if rid == "place_centrale":
        place(bg, load("44_fance"), 250, H - 110, max_w=480)
        place(bg, load("44_fance"), W - 220, H - 110, max_w=520)
        place(bg, load("24_hous_house"), W // 2, H - 110, max_h=520)
        place(bg, load("15_signboard"), 220, H - 120, max_w=200)
        place(bg, load("35_bench"), W - 260, H - 110, max_w=170)
        place(bg, load("36_plant_plant"), W - 130, H - 105, max_w=110)
        place(bg, load("03_magician_magician"), 380, H - 110, max_w=130)
        add_ambient_glow(bg, W//2, H - 350, 240, accent, 1.0)
    elif rid == "taverne_etoilee":
        place(bg, load("24_hous_house"), 420, H - 110, max_h=520)
        place(bg, load("28_table_and_benches_table_and_benches"), W - 380, H - 110, max_w=320)
        place(bg, load("17_barrel"), W - 240, H - 110, max_w=90)
        place(bg, load("18_barrel_2"), W - 170, H - 110, max_w=90)
        place(bg, load("16_jug"), W - 290, H - 175, max_w=70)
        place(bg, load("11_torch"), 130, H - 110, max_w=80)
        place(bg, load("11_torch"), W - 90, H - 110, max_w=80)
        place(bg, load("10_apples_on_sticks"), 740, H - 175, max_w=120)
        add_ambient_glow(bg, 130, H - 280, 140, (255,170,80), 1.2)
        add_ambient_glow(bg, W - 90, H - 280, 140, (255,170,80), 1.2)
    elif rid == "marche_astral":
        place(bg, load("52_drawers"), 280, H - 110, max_w=320)
        place(bg, load("42_drawers"), 540, H - 110, max_w=120)
        place(bg, load("24_hous_bowls"), 760, H - 130, max_w=260)
        place(bg, load("53_bags"), 1000, H - 110, max_w=130)
        place(bg, load("20_bags"), 1080, H - 110, max_w=110)
        place(bg, load("15_signboard"), 120, H - 120, max_w=200)
        place(bg, load("21_water_barrel"), 1180, H - 110, max_w=110)
        add_ambient_glow(bg, W//2, H - 400, 280, accent, 1.0)
    elif rid == "quartier_guildes":
        place(bg, load("29_barn"), 380, H - 110, max_w=620)
        place(bg, load("24_hous_house"), 980, H - 110, max_h=480)
        place(bg, load("31_fence"), W // 2, H - 110, max_w=900, opacity=0.85)
        place(bg, load("15_signboard"), 130, H - 120, max_w=200)
        place(bg, load("11_torch"), 80, H - 110, max_w=80)
        place(bg, load("11_torch"), W - 60, H - 110, max_w=80)
        add_ambient_glow(bg, 80, H - 280, 130, (255,180,90), 1.0)
    elif rid == "arene":
        place(bg, load("31_fence"), W // 2, H - 110, max_w=1000)
        place(bg, load("22_target_and_arrows"), 200, H - 110, max_w=160)
        place(bg, load("22_target_and_arrows"), W - 200, H - 110, max_w=160)
        place(bg, load("28_table_and_benches_bow"), W // 2, H - 110, max_w=220)
        place(bg, load("19_drying_for_the_skin"), 410, H - 110, max_w=200)
        place(bg, load("11_torch"), 60, H - 110, max_w=80)
        place(bg, load("11_torch"), W - 60, H - 110, max_w=80)
        place(bg, load("06_assassin_girl"), 720, H - 110, max_w=130)
        add_ambient_glow(bg, W//2, H - 380, 320, (255,90,70), 1.4)
    elif rid == "vallee_boss":
        place(bg, load("14_tree"), 180, H - 110, max_h=440)
        place(bg, load("12_tree_2"), W - 220, H - 110, max_h=420)
        place(bg, load("05_daemon_demonic_circle"), W // 2, H - 100, max_w=680, opacity=0.55)
        place(bg, load("05_daemon_daemon"), W // 2, H - 130, max_w=230)
        place(bg, load("00_little_dragon_dragon"), 380, H - 200, max_w=160)
        place(bg, load("01_little_dragon2_dragon"), W - 360, H - 220, max_w=130)
        place(bg, load("36_stone"), 520, H - 110, max_w=180, opacity=0.85)
        place(bg, load("36_stone"), W - 520, H - 110, max_w=170, opacity=0.85)
        add_ambient_glow(bg, W//2, H - 260, 360, (255, 60, 50), 1.7)
    elif rid == "hall_legendes":
        place(bg, load("24_hous_house"), W // 2, H - 110, max_h=560)
        place(bg, load("49_stairs"), W // 2, H - 110, max_w=420, opacity=0.9)
        place(bg, load("11_torch"), 200, H - 110, max_w=80)
        place(bg, load("11_torch"), W - 200, H - 110, max_w=80)
        place(bg, load("15_signboard"), 90, H - 120, max_w=180)
        add_ambient_glow(bg, W//2, H - 420, 320, (110,180,255), 1.2)
    elif rid == "bibliotheque_infinie":
        place(bg, load("52_drawers"), 280, H - 110, max_w=300)
        place(bg, load("52_drawers"), W - 280, H - 110, max_w=300)
        place(bg, load("42_drawers"), 580, H - 110, max_w=120)
        place(bg, load("42_drawers"), W - 580, H - 110, max_w=120)
        place(bg, load("49_stairs"), W // 2, H - 110, max_w=380, opacity=0.85)
        place(bg, load("03_magician_magician"), W // 2, H - 110, max_w=160)
        place(bg, load("16_jug"), 540, H - 200, max_w=70)
        add_ambient_glow(bg, W//2, H - 320, 260, (110,180,255), 1.4)
    elif rid == "archives":
        place(bg, load("52_drawers"), 220, H - 110, max_w=280)
        place(bg, load("52_drawers"), W - 220, H - 110, max_w=280)
        place(bg, load("53_bags"), 460, H - 110, max_w=130)
        place(bg, load("17_barrel"), 600, H - 110, max_w=90)
        place(bg, load("18_barrel_2"), W - 460, H - 110, max_w=110)
        place(bg, load("15_signboard"), W // 2, H - 130, max_w=240)
        place(bg, load("11_torch"), 80, H - 110, max_w=80)
        place(bg, load("11_torch"), W - 80, H - 110, max_w=80)
        add_ambient_glow(bg, W//2, H - 380, 240, (110,180,255), 1.0)
    elif rid == "sanctuaire_oracle":
        place(bg, load("12_tree_2"), 200, H - 110, max_h=420)
        place(bg, load("14_tree"), W - 200, H - 110, max_h=440)
        place(bg, load("05_daemon_demonic_circle"), W // 2, H - 110, max_w=520, opacity=0.6)
        place(bg, load("03_magician_magician"), W // 2, H - 130, max_w=180)
        place(bg, load("03_magician_snake"), 520, H - 110, max_w=120)
        place(bg, load("03_magician_snake_2"), W - 520, H - 110, max_w=110)
        place(bg, load("11_torch"), 130, H - 110, max_w=80)
        place(bg, load("11_torch"), W - 130, H - 110, max_w=80)
        add_ambient_glow(bg, W//2, H - 340, 320, accent, 1.6)
    elif rid == "sanctuaire_failles":
        place(bg, load("51_tree3"), 200, H - 110, max_h=380)
        place(bg, load("51_tree3"), W - 200, H - 110, max_h=380)
        place(bg, load("05_daemon_demonic_circle"), W // 2, H - 80, max_w=620, opacity=0.65)
        place(bg, load("07_thief_thief"), 460, H - 110, max_w=140)
        place(bg, load("02_little_dragon3_dragon"), 800, H - 220, max_w=130)
        place(bg, load("00_little_dragon_dragon"), 920, H - 350, max_w=140, opacity=0.85)
        add_ambient_glow(bg, W//2, H - 280, 380, (255, 60, 220), 1.7)
    elif rid == "laboratoire_alchimistes":
        place(bg, load("27_smithy_roaster"), 320, H - 110, max_w=240)
        place(bg, load("17_barrel"), 540, H - 110, max_w=90)
        place(bg, load("18_barrel_2"), 620, H - 110, max_w=90)
        place(bg, load("16_jug"), 460, H - 200, max_w=70)
        place(bg, load("24_hous_bowls"), 840, H - 140, max_w=280)
        place(bg, load("42_drawers"), 1100, H - 110, max_w=140)
        place(bg, load("03_magician_magician"), 700, H - 110, max_w=140)
        place(bg, load("55_fire"), 340, H - 160, max_w=80)
        add_ambient_glow(bg, 340, H - 240, 180, (255,140,40), 1.5)
    elif rid == "atelier_inventeurs":
        place(bg, load("27_smithy_smithy"), 380, H - 110, max_w=520)
        place(bg, load("27_smithy_smoke"), 480, H - 480, max_w=170, opacity=0.65)
        place(bg, load("27_smithy_roaster"), 760, H - 110, max_w=200)
        place(bg, load("55_fire"), 380, H - 200, max_w=90)
        place(bg, load("17_barrel"), 980, H - 110, max_w=100)
        place(bg, load("16_jug"), 1080, H - 110, max_w=80)
        place(bg, load("53_bags"), 1180, H - 110, max_w=130)
        place(bg, load("03_magician_magician"), 800, H - 110, max_w=150)
        add_ambient_glow(bg, 420, H - 280, 220, (255,140,40), 1.6)
    elif rid == "temple_temps":
        place(bg, load("24_hous_house"), W // 2, H - 110, max_h=520)
        place(bg, load("05_daemon_demonic_circle"), W // 2, H - 100, max_w=520, opacity=0.5)
        place(bg, load("50_stairs"), W // 2, H - 110, max_w=900, opacity=0.85)
        place(bg, load("03_magician_magician"), W // 2, H - 110, max_w=160)
        place(bg, load("11_torch"), 160, H - 110, max_w=80)
        place(bg, load("11_torch"), W - 160, H - 110, max_w=80)
        add_ambient_glow(bg, W//2, H - 380, 360, accent, 1.6)
    elif rid == "necropole":
        place(bg, load("14_tree"), 180, H - 110, max_h=440)
        place(bg, load("12_tree_2"), W - 220, H - 110, max_h=420)
        place(bg, load("36_stone"), 320, H - 110, max_w=160)
        place(bg, load("47_stone"), 480, H - 110, max_w=80)
        place(bg, load("48_stone"), 580, H - 110, max_w=70)
        place(bg, load("47_stone"), W - 480, H - 110, max_w=80)
        place(bg, load("48_stone"), W - 580, H - 110, max_w=70)
        place(bg, load("05_daemon_daemon"), W // 2, H - 130, max_w=220, opacity=0.95)
        place(bg, load("05_daemon_demonic_circle"), W // 2, H - 100, max_w=520, opacity=0.45)
        place(bg, load("07_thief_thief"), 780, H - 110, max_w=130, opacity=0.85)
        add_ambient_glow(bg, W//2, H - 280, 360, (180, 50, 220), 1.5)
    elif rid == "jardin_songes":
        place(bg, load("14_tree"), 180, H - 110, max_h=440)
        place(bg, load("12_tree_2"), W - 220, H - 110, max_h=420)
        place(bg, load("38_bushes"), 380, H - 110, max_w=260)
        place(bg, load("40_bushes"), 540, H - 110, max_w=170)
        place(bg, load("41_bushes_s"), 660, H - 110, max_w=140)
        place(bg, load("34_well"), 800, H - 110, max_w=130)
        place(bg, load("35_bench"), 980, H - 110, max_w=160)
        place(bg, load("04_fox_fox"), 460, H - 110, max_w=90)
        place(bg, load("04_fox_grass"), 460, H - 105, max_w=80, opacity=0.7)
        place(bg, load("36_plant_plant_5"), 1100, H - 110, max_w=110)
        add_ambient_glow(bg, W//2, H - 400, 320, (130, 220, 130), 1.0)
    elif rid == "observatoire":
        place(bg, load("24_hous_house"), W // 2, H - 110, max_h=520)
        place(bg, load("00_little_dragon_dragon"), 320, H - 380, max_w=140, opacity=0.85)
        place(bg, load("02_little_dragon3_dragon"), W - 320, H - 420, max_w=120, opacity=0.85)
        place(bg, load("11_torch"), 200, H - 110, max_w=80)
        place(bg, load("11_torch"), W - 200, H - 110, max_w=80)
        place(bg, load("03_magician_magician"), W // 2, H - 110, max_w=160)
        add_ambient_glow(bg, W//2, H - 460, 320, (140, 180, 255), 1.4)
    elif rid == "camp_aventuriers":
        place(bg, load("30_barn_2"), 320, H - 110, max_w=160)
        place(bg, load("29_barn"), W - 380, H - 110, max_w=520)
        place(bg, load("28_table_and_benches_table_and_benches"), 540, H - 110, max_w=260)
        place(bg, load("28_table_and_benches_bow"), 460, H - 220, max_w=180)
        place(bg, load("22_target_and_arrows"), 800, H - 110, max_w=140)
        place(bg, load("23_arrow_in_the_fence"), 880, H - 200, max_w=100)
        place(bg, load("55_fire"), 380, H - 160, max_w=90)
        place(bg, load("06_assassin_girl"), 660, H - 110, max_w=140)
        add_ambient_glow(bg, 380, H - 240, 180, (255,140,40), 1.5)
    elif rid == "chambre_reliques":
        place(bg, load("52_drawers"), 280, H - 110, max_w=300)
        place(bg, load("42_drawers"), 540, H - 110, max_w=120)
        place(bg, load("53_bags"), 700, H - 110, max_w=140)
        place(bg, load("16_jug"), 860, H - 110, max_w=90)
        place(bg, load("21_water_barrel"), 1000, H - 110, max_w=120)
        place(bg, load("17_barrel"), 1140, H - 110, max_w=100)
        place(bg, load("11_torch"), 120, H - 110, max_w=80)
        place(bg, load("11_torch"), W - 120, H - 110, max_w=80)
        add_ambient_glow(bg, W//2, H - 380, 280, (255, 200, 110), 1.2)
    elif rid == "pantheon":
        place(bg, load("24_hous_house"), W // 2, H - 110, max_h=540)
        place(bg, load("50_stairs"), W // 2, H - 110, max_w=950, opacity=0.85)
        place(bg, load("15_signboard"), 160, H - 130, max_w=200)
        place(bg, load("11_torch"), 80, H - 110, max_w=80)
        place(bg, load("11_torch"), W - 80, H - 110, max_w=80)
        place(bg, load("31_fence"), W // 2, H - 110, max_w=860, opacity=0.7)
        add_ambient_glow(bg, W//2, H - 460, 320, (110,180,255), 1.3)
    elif rid == "nexus_cosmique":
        place(bg, load("05_daemon_demonic_circle"), W // 2, H - 60, max_w=820, opacity=0.7)
        place(bg, load("05_daemon_daemon"), W // 2, H - 130, max_w=260)
        place(bg, load("00_little_dragon_dragon"), 280, H - 320, max_w=160)
        place(bg, load("01_little_dragon2_dragon"), W - 280, H - 360, max_w=140)
        place(bg, load("02_little_dragon3_dragon"), 380, H - 480, max_w=120)
        place(bg, load("27_smithy_smoke"), W // 2, H - 600, max_w=240, opacity=0.4)
        place(bg, load("03_magician_magician"), 220, H - 110, max_w=140)
        place(bg, load("03_magician_magician"), W - 220, H - 110, max_w=140)
        place(bg, load("11_torch"), 80, H - 110, max_w=80)
        place(bg, load("11_torch"), W - 80, H - 110, max_w=80)
        add_ambient_glow(bg, W//2, H - 320, 460, (170,100,255), 1.8)
    elif rid == "salle_conseil":
        place(bg, load("24_hous_house"), W // 2, H - 110, max_h=520)
        place(bg, load("28_table_and_benches_table_and_benches"), W // 2, H - 110, max_w=320)
        place(bg, load("35_bench"), 380, H - 110, max_w=170)
        place(bg, load("35_bench"), W - 380, H - 110, max_w=170)
        place(bg, load("11_torch"), 200, H - 110, max_w=80)
        place(bg, load("11_torch"), W - 200, H - 110, max_w=80)
        place(bg, load("03_magician_magician"), W // 2, H - 250, max_w=140)
        add_ambient_glow(bg, W//2, H - 420, 360, (170,100,255), 1.4)
    else:
        # default scene
        place(bg, load("12_tree_2"), 240, H - 110, max_h=400)
        place(bg, load("24_hous_house"), W // 2, H - 110, max_h=480)
        place(bg, load("14_tree"), W - 240, H - 110, max_h=420)
        place(bg, load("38_bushes"), 480, H - 110, max_w=260)
        place(bg, load("40_bushes"), W - 480, H - 110, max_w=200)
        place(bg, load("11_torch"), 90, H - 110, max_w=80)
        place(bg, load("11_torch"), W - 90, H - 110, max_w=80)
        add_ambient_glow(bg, W//2, H - 380, 280, accent, 1.0)

    add_ground_band(bg, accent)

    # Slight cinematic vignette
    vign = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    vd = ImageDraw.Draw(vign)
    for i in range(160):
        a = max(0, int(180 * (i / 160) ** 2))
        vd.rectangle([i, i, W - i, H - i], outline=(0, 0, 0, a))
    vign = vign.filter(ImageFilter.GaussianBlur(60))
    bg.alpha_composite(vign)

    return bg


# Load room list from backend
def load_rooms():
    """Read rooms from nexus_rooms.py — ROOMS is a dict id -> room."""
    rooms = []
    try:
        import sys
        sys.path.insert(0, "/app/backend")
        from nexus_rooms import ROOMS
        for rid, r in ROOMS.items():
            rooms.append({"id": rid, "name": r.get("name", rid), "group": r.get("group", "mystic")})
    except Exception as e:
        print("loader failed:", e)
    return rooms


if __name__ == "__main__":
    rooms = load_rooms()
    print(f"Composing {len(rooms)} rooms...")
    out = {}
    for room in rooms:
        try:
            scene = compose(room)
            fp = os.path.join(OUT_DIR, f"{room['id']}.png")
            scene.convert("RGB").save(fp, "PNG", optimize=True)
            # Thumbnail (640x360)
            thumb = scene.resize((640, 360), Image.LANCZOS)
            thumb.convert("RGB").save(os.path.join(THUMB_DIR, f"{room['id']}.jpg"), "JPEG", quality=78, optimize=True)
            out[room['id']] = {
                "scene": f"/world/rooms/{room['id']}.png",
                "thumb": f"/world/thumbs/{room['id']}.jpg",
            }
            print(f"  ✓ {room['id']}")
        except Exception as e:
            print(f"  ✗ {room['id']}: {e}")
    with open(os.path.join(OUT_DIR, "_index.json"), "w") as f:
        json.dump(out, f, indent=2, ensure_ascii=False)
    print(f"Done — {len(out)} scenes written.")
