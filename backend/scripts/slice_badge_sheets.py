"""Slice NEXORIA badge sprite sheets into individual PNG assets."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
ASSETS = Path(r"C:\Users\33647\.cursor\projects\c-Users-33647-Projects-nexoria\assets")
OUT = ROOT / "frontend" / "public" / "assets" / "badges"

SHEETS = {
    "ranks": {
        "src": "c__Users_33647_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_8b007c7ccb174ea98516ad9843590210_tplv-tnf8g33v4j-ai-watermark-resize_2741_1530-f7fddc70-08aa-4fcd-bd10-4b431a1b094c.png",
        "grid": (8, 1),
        "names": [
            "novice", "initie", "rare", "epique",
            "legendaire", "mythique", "divin", "cosmique",
        ],
    },
    "classes": {
        "src": "c__Users_33647_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_fc9c806717fd48579fc5be1561e11dfa_tplv-tnf8g33v4j-ai-watermark-resize_2741_1530-ac26bedb-b41e-41a0-b71e-3baeeb6bfa88.png",
        "grid": (5, 2),
        "names": [
            "mage", "warrior", "assassin", "paladin", "alchemist",
            "explorer", "necromancer", "architect", "chronomancer", "inventor",
        ],
    },
    "rarities": {
        "src": "c__Users_33647_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_3160199b1f4f48e6bd5063492e47c0b4_tplv-tnf8g33v4j-ai-watermark-resize_2741_1530-c9d4934d-d8b8-4b5a-9316-8ba1590556bc.png",
        "grid": (4, 2),
        "names": [
            "common", "rare", "epic", "legendary",
            "mythic", "divine", "void", "cosmic",
        ],
    },
}


def trim_transparent(im: Image.Image, pad: int = 8) -> Image.Image:
    if im.mode != "RGBA":
        im = im.convert("RGBA")
    bbox = im.getbbox()
    if not bbox:
        return im
    x0, y0, x1, y1 = bbox
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(im.width, x1 + pad)
    y1 = min(im.height, y1 + pad)
    return im.crop((x0, y0, x1, y1))


def slice_sheet(key: str, spec: dict) -> None:
    src = ASSETS / spec["src"]
    if not src.exists():
        raise FileNotFoundError(src)
    im = Image.open(src).convert("RGBA")
    cols, rows = spec["grid"]
    names = spec["names"]
    cell_w = im.width // cols
    cell_h = im.height // rows
    dest = OUT / key
    dest.mkdir(parents=True, exist_ok=True)

    idx = 0
    for row in range(rows):
        for col in range(cols):
            if idx >= len(names):
                break
            box = (col * cell_w, row * cell_h, (col + 1) * cell_w, (row + 1) * cell_h)
            tile = trim_transparent(im.crop(box))
            # Normalize to square 256px for crisp UI scaling
            side = max(tile.width, tile.height)
            square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
            ox = (side - tile.width) // 2
            oy = (side - tile.height) // 2
            square.paste(tile, (ox, oy), tile)
            square = square.resize((256, 256), Image.Resampling.LANCZOS)
            out_path = dest / f"{names[idx]}.png"
            square.save(out_path, "PNG", optimize=True)
            print(f"  {out_path.relative_to(ROOT)}")
            idx += 1


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for key, spec in SHEETS.items():
        print(f"[{key}]")
        slice_sheet(key, spec)
    print("Done.")


if __name__ == "__main__":
    main()
