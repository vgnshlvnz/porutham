import sharp from "sharp";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../public");
const svg = readFileSync(path.join(dir, "favicon.svg"));
for (const size of [192, 512]) {
  await sharp(svg).resize(size, size).png().toFile(path.join(dir, `icon-${size}.png`));
}
console.log("wrote icon-192.png and icon-512.png");
