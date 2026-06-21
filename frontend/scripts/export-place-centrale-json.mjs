import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jsPath = path.join(__dirname, "../public/assets/nexus-online/rooms/place-centrale.js");
const outPath = path.join(__dirname, "../public/assets/nexus-online/rooms/place-centrale.json");
const source = fs.readFileSync(jsPath, "utf8");
const marker = '{ "compressionlevel"';
const start = source.indexOf(marker);
const closeIdx = source.lastIndexOf("});");
if (start < 0 || closeIdx < 0) {
  throw new Error("Could not parse Tiled JS export");
}
const data = JSON.parse(source.slice(start, closeIdx + 1));
fs.writeFileSync(outPath, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Wrote ${outPath} (${fs.statSync(outPath).size} bytes)`);
