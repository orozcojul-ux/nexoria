"""Prepare nexoria-nexus-city background (remove bottom-right watermark)."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SRC = Path(
    r"C:\Users\33647\.cursor\projects\c-Users-33647-Projects-nexoria\assets"
    r"\c__Users_33647_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images"
    r"_fondd-a29d9a9d-29fa-4b23-a992-e9058da02ae7.png"
)
OUT_DIR = ROOT / "frontend" / "public" / "assets" / "backgrounds"


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    img = Image.open(SRC).convert("RGB")
    w, h = img.size

    # Remove bottom-right "AI" badge by cloning balcony stone texture.
    wm_w, wm_h = 88, 52
    x0, y0 = w - wm_w, h - wm_h
    src_patch = img.crop((max(0, x0 - wm_w), max(0, y0 - wm_h), x0, y0))
    src_patch = src_patch.resize((wm_w, wm_h), Image.Resampling.LANCZOS)
    src_patch = src_patch.filter(ImageFilter.GaussianBlur(radius=1.0))
    img.paste(src_patch, (x0, y0))

    # Upscale for large displays (source is 1024px wide).
    target_w = 2560
    target_h = max(1, round(h * (target_w / w)))
    img = img.resize((target_w, target_h), Image.Resampling.LANCZOS)

    webp_path = OUT_DIR / "nexoria-nexus-city.webp"
    jpg_path = OUT_DIR / "nexoria-nexus-city.jpg"
    img.save(webp_path, "WEBP", quality=85, method=6)
    img.save(jpg_path, "JPEG", quality=88, optimize=True)
    print(f"Saved {webp_path} ({img.size})")


if __name__ == "__main__":
    main()
