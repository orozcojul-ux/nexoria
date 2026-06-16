"""Nettoie et exporte le fond d'écran global Nexoria."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageStat

SRC = Path(
    r"C:\Users\33647\.cursor\projects\c-Users-33647-Projects-nexoria\assets"
    r"\c__Users_33647_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images"
    r"_fond1-7508c205-49e6-444e-8ddb-d85e20095c6c.png"
)
OUT_DIR = Path(r"C:\Users\33647\Projects\nexoria\frontend\public\assets\backgrounds")
OUT_WEBP = OUT_DIR / "nexoria-bg.webp"
OUT_JPG = OUT_DIR / "nexoria-bg.jpg"


def _avg_color(im: Image.Image, box):
    region = im.crop(box).convert("RGB")
    stat = ImageStat.Stat(region)
    return tuple(int(v) for v in stat.mean)


def _fill_region(im: Image.Image, box, color):
    overlay = Image.new("RGB", im.size, color)
    mask = Image.new("L", im.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rectangle(box, fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(radius=6))
    base = im.convert("RGB")
    return Image.composite(overlay, base, mask)


def clean_watermark(im: Image.Image) -> Image.Image:
    """Retire le logo AI en bas à droite (dans l'ornement doré)."""
    w, h = im.size
    im = im.convert("RGBA")
    br_w = max(72, int(w * 0.09))
    br_h = max(56, int(h * 0.16))
    br_box = (w - br_w, h - br_h, w, h)
    sample = (max(0, w - br_w - 60), max(0, h - br_h - 20), w - br_w, h - 10)
    return _fill_region(im, br_box, _avg_color(im, sample))


def main():
    if not SRC.exists():
        raise SystemExit(f"Source introuvable: {SRC}")
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    im = Image.open(SRC)
    cleaned = clean_watermark(im)
    rgb = cleaned.convert("RGB")
    rgb.save(OUT_WEBP, "WEBP", quality=90, method=6)
    rgb.save(OUT_JPG, "JPEG", quality=92, optimize=True)
    print(f"OK {im.size[0]}x{im.size[1]} -> {OUT_WEBP}")


if __name__ == "__main__":
    main()
