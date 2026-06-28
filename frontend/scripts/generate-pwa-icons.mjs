/**
 * Generate PWA PNG icons from public/favicon.svg.
 * Run: node scripts/generate-pwa-icons.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const svgPath = path.join(root, "public", "favicon.svg");
const outDir = path.join(root, "public", "icons");

const BG = { r: 7, g: 7, b: 17, alpha: 1 };

async function main() {
  if (!fs.existsSync(svgPath)) {
    console.error("Missing public/favicon.svg");
    process.exit(1);
  }
  fs.mkdirSync(outDir, { recursive: true });
  const svg = fs.readFileSync(svgPath);

  await sharp(svg).resize(192, 192).png().toFile(path.join(outDir, "icon-192.png"));
  await sharp(svg).resize(512, 512).png().toFile(path.join(outDir, "icon-512.png"));
  await sharp(svg).resize(180, 180).png().toFile(path.join(outDir, "apple-touch-icon.png"));

  const logo410 = await sharp(svg).resize(410, 410).png().toBuffer();
  await sharp({
    create: { width: 512, height: 512, channels: 4, background: BG },
  })
    .composite([{ input: logo410, gravity: "center" }])
    .png()
    .toFile(path.join(outDir, "maskable-icon-512.png"));

  console.log("PWA icons written to public/icons/");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
