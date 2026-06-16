"""Copie et nettoie les bannières (retrait watermark AI / Pippit / logos coin)."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageStat

ASSETS = Path(r"C:\Users\33647\.cursor\projects\c-Users-33647-Projects-nexoria\assets")
OUT = Path(r"C:\Users\33647\Projects\nexoria\frontend\public\assets\banners")

MAP = {
    "391961de186e4d4da57adb9da809f0ba": "settings",
    "29dd10cf26ff4e20a1ca75d6d1565105": "events",
    "84dbf8e6fd304c9fb2a0f1f9f74716db": "world",
    "83ef69d32f3a41ef9166fd3296546a71": "guilds",
    "97d21a292dc94f9ea011faf61caca841": "forum",
    "449ec4c338544738abbb488bd00febcf": "quests",
    "ffce0a0b573c4317b40e57a66e25303d": "oracle",
    "05017f0626dd42fca41a626a35fa6b35": "inventory",
    "image_Pippit_202606142325-31820eda": "leaderboards",
    "image_Pippit_202606142326": "admin",
    "image_Pippit_202606142325__1_": "classes",
    "aae283ed82494c428419b628ccd4e8d6": "friends",
    "1f81e0a7a6114f339f077d218e6179e3": "shop",
    "d458bad7e0fe4f5e9a016ad0d97456cd": "tickets",
}

PIPPIT_KEYS = {"leaderboards", "admin", "classes"}
# Logo NEXORIA + AI en bas à droite sur certaines bannières
LARGE_BR_KEYS = {"friends", "shop", "tickets", "settings"}


def _avg_color(im: Image.Image, box):
    region = im.crop(box).convert("RGB")
    stat = ImageStat.Stat(region)
    return tuple(int(v) for v in stat.mean)


def _fill_region(im: Image.Image, box, color):
    overlay = Image.new("RGB", im.size, color)
    mask = Image.new("L", im.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rectangle(box, fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(radius=4))
    base = im.convert("RGB")
    return Image.composite(overlay, base, mask)


def clean_watermarks(im: Image.Image, page_key: str) -> Image.Image:
    w, h = im.size
    im = im.convert("RGBA")

    br_w = max(100, int(w * 0.12)) if page_key in LARGE_BR_KEYS else max(72, int(w * 0.09))
    br_h = max(72, int(h * 0.18)) if page_key in LARGE_BR_KEYS else max(56, int(h * 0.14))
    br_box = (w - br_w, h - br_h, w, h)
    sample_br = (max(0, w - br_w - 40), max(0, h - br_h - 10), w - br_w, h)
    im = _fill_region(im, br_box, _avg_color(im, sample_br))

    if page_key in PIPPIT_KEYS:
        tl_w = max(120, int(w * 0.16))
        tl_h = max(64, int(h * 0.11))
        tl_box = (0, 0, tl_w, tl_h)
        sample_tl = (tl_w, 0, min(w, tl_w + 40), tl_h)
        im = _fill_region(im, tl_box, _avg_color(im, sample_tl))

    return im


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    files = list(ASSETS.glob("*.png"))
    done = []

    for key, page in MAP.items():
        match = next((f for f in files if key in f.name), None)
        if not match:
            print(f"MISSING: {page} ({key})")
            continue
        im = Image.open(match)
        cleaned = clean_watermarks(im, page)
        out_path = OUT / f"{page}.webp"
        cleaned.convert("RGB").save(out_path, "WEBP", quality=90, method=6)
        print(f"OK {page} <- {match.name} ({im.size[0]}x{im.size[1]})")
        done.append(page)

    print(f"\n{len(done)} bannières dans {OUT}")


if __name__ == "__main__":
    main()
