#!/usr/bin/env node
// Prepare card media: resize a dark and light screenshot to 1000px-wide
// JPEGs and a logo to a 128px PNG under assets/cards/src/.
//
// Usage:
//   NODE_PATH=<dir containing playwright> node scripts/cards/prepare-media.mjs \
//     <id> <dark-screenshot> <light-screenshot> [logo]
//
// Screenshots should be 1440x900 (any DPR) captures of the live product with
// popups dismissed. Never pass an unsanitized capture of a private project.
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = join(root, "assets/cards/src");
const [id, darkShot, lightShot, logo] = process.argv.slice(2);
if (!id || !darkShot || !lightShot) {
  console.error("usage: prepare-media.mjs <id> <dark> <light> [logo]");
  process.exit(1);
}

const mime = (f) =>
  ({ ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg", ".svg": "image/svg+xml" })[
    extname(f).toLowerCase()
  ];

async function encode(page, file, width, type, quality) {
  const data = readFileSync(file).toString("base64");
  const url = await page.evaluate(
    async ({ src, width, type, quality }) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      const w = width;
      const h = Math.round(((img.naturalHeight || w) * w) / (img.naturalWidth || w));
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, w, h);
      return c.toDataURL(type, quality);
    },
    { src: `data:${mime(file)};base64,${data}`, width, type, quality },
  );
  return Buffer.from(url.split(",")[1], "base64");
}

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [theme, file] of [["dark", darkShot], ["light", lightShot]]) {
  const buf = await encode(page, file, 1000, "image/jpeg", 0.8);
  writeFileSync(join(outDir, `${id}-${theme}.jpg`), buf);
  console.log(`${id}-${theme}.jpg ${buf.length} bytes`);
}
if (logo) {
  const buf = await encode(page, logo, 128, "image/png");
  writeFileSync(join(outDir, `${id}-logo.png`), buf);
  console.log(`${id}-logo.png ${buf.length} bytes`);
}
await browser.close();
