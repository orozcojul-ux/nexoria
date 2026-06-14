"""One-shot generation of 4 cosmetic visuals for the NEXORIA shop.
Run once: python -m backend.scripts.gen_shop_visuals
"""
import asyncio
import os
import base64
from pathlib import Path
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage

load_dotenv()
OUT_DIR = Path("/app/frontend/public/shop")
OUT_DIR.mkdir(parents=True, exist_ok=True)

ITEMS = {
    "sword": (
        "epee_legendaire",
        "An ornate legendary fantasy longsword artifact floating, glowing violet "
        "and cyan magical energy radiating from the blade, intricate cosmic runes "
        "engraved along the blade, golden hilt with a deep purple gemstone, dark "
        "starry void background, dramatic studio lighting, AAA MMORPG game asset, "
        "highly detailed, sharp focus, painterly digital illustration, dark "
        "fantasy / cosmic / mystical aesthetic, no text, centered composition."
    ),
    "armor": (
        "armure_cosmique",
        "A full-body fantasy cosmic plate armor set displayed on an invisible "
        "mannequin, dark obsidian metal with glowing cyan crystalline accents and "
        "purple nebula veins, ornate golden filigree, mythic AAA MMORPG character "
        "equipment, dark starry void background, dramatic studio lighting, "
        "painterly digital illustration, no text, centered composition."
    ),
    "mount": (
        "monture_mythique",
        "A majestic mythical fantasy mount creature: a celestial spectral wolf "
        "with translucent purple and cyan astral fur, glowing star-flecked mane, "
        "luminous eyes, standing proudly on a cosmic platform, dark starry void "
        "background, dramatic studio lighting, AAA MMORPG mount asset, painterly "
        "digital illustration, dark fantasy / cosmic / mystical aesthetic, no "
        "text, centered composition."
    ),
    "chest": (
        "coffre_divin",
        "An ornate fantasy divine treasure chest, made of obsidian and gold with "
        "glowing violet and cyan magical runes, slightly open with intense golden "
        "light pouring out, floating cosmic crystals around it, dark starry void "
        "background, dramatic studio lighting, AAA MMORPG loot chest asset, "
        "painterly digital illustration, dark fantasy / cosmic aesthetic, no "
        "text, centered composition."
    ),
}


async def gen_one(key: str, name: str, prompt: str):
    api_key = os.getenv("EMERGENT_LLM_KEY")
    if not api_key:
        print(f"[gen_shop_visuals] EMERGENT_LLM_KEY missing — skipping {name}")
        return
    chat = LlmChat(
        api_key=api_key,
        session_id=f"shop_visual_{name}",
        system_message="You are an expert digital artist for AAA fantasy MMORPG.",
    )
    chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(
        modalities=["image", "text"]
    )
    msg = UserMessage(text=prompt)
    text, images = await chat.send_message_multimodal_response(msg)
    if not images:
        print(f"[gen_shop_visuals] No image returned for {name}")
        return
    out_path = OUT_DIR / f"{name}.png"
    image_bytes = base64.b64decode(images[0]["data"])
    with open(out_path, "wb") as f:
        f.write(image_bytes)
    print(f"[gen_shop_visuals] {key} → {out_path} ({len(image_bytes)} bytes)")


async def main():
    for key, (name, prompt) in ITEMS.items():
        try:
            await gen_one(key, name, prompt)
        except Exception as e:
            print(f"[gen_shop_visuals] FAILED for {key}: {e}")


if __name__ == "__main__":
    asyncio.run(main())
