/**
 * Generate PWA + favicon PNGs from public/logo-nexoria.png.
 * Run: npm run pwa:icons (from frontend/)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const sourcePath = path.join(root, "public", "logo-nexoria.png");
const publicDir = path.join(root, "public");
const outDir = path.join(publicDir, "icons");

const BG = { r: 0, g: 0, b: 0, alpha: 1 };

async function writePng(input, size, outPath, fit = "contain") {
  await sharp(input)
    .resize(size, size, { fit, background: BG })
    .png()
    .toFile(outPath);
}

async function main() {
  if (!fs.existsSync(sourcePath)) {
    console.error("Missing public/logo-nexoria.png — add the NEXORIA logo source image.");
    process.exit(1);
  }
  fs.mkdirSync(outDir, { recursive: true });
  const source = fs.readFileSync(sourcePath);

  await writePng(source, 16, path.join(publicDir, "favicon-16.png"));
  await writePng(source, 32, path.join(publicDir, "favicon-32.png"));
  await writePng(source, 192, path.join(outDir, "icon-192.png"));
  await writePng(source, 512, path.join(outDir, "icon-512.png"));
  await writePng(source, 180, path.join(outDir, "apple-touch-icon.png"));

  const logo410 = await sharp(source)
    .resize(410, 410, { fit: "contain", background: BG })
    .png()
    .toBuffer();
  await sharp({
    create: { width: 512, height: 512, channels: 4, background: BG },
  })
    .composite([{ input: logo410, gravity: "center" }])
    .png()
    .toFile(path.join(outDir, "maskable-icon-512.png"));

  console.log("Icons written:");
  console.log("  public/favicon-16.png, favicon-32.png");
  console.log("  public/icons/icon-192.png, icon-512.png, apple-touch-icon.png, maskable-icon-512.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
