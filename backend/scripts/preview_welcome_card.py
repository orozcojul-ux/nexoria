#!/usr/bin/env python3
"""Prévisualise une welcome card sans poster sur Discord."""
from __future__ import annotations

import argparse
import asyncio
import io
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from PIL import Image

import discord_welcome_card


async def main() -> int:
    parser = argparse.ArgumentParser(description="Preview NEXORIA Discord welcome card")
    parser.add_argument("--username", default="SmouzYi")
    parser.add_argument("--global-name", default="")
    parser.add_argument("--avatar-url", default="")
    parser.add_argument("--out", default="welcome_preview.png")
    args = parser.parse_args()

    user = {
        "id": "123456789012345678",
        "username": args.username,
        "global_name": args.global_name or args.username,
    }
    if args.avatar_url:
        data = await discord_welcome_card.generate_welcome_card_bytes(user, args.avatar_url)
        if not data:
            print("Échec génération (avatar URL)", file=sys.stderr)
            return 1
        Path(args.out).write_bytes(data)
    else:
        avatar = Image.new("RGBA", (512, 512), (90, 50, 130, 255))
        card = discord_welcome_card.render_welcome_card(user, avatar)
        card.save(args.out, "PNG", optimize=True)

    print(f"OK -> {Path(args.out).resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
