#!/usr/bin/env node
// Prepare staged card media on TJN-DESK through desk-run.ps1, without a browser.
//   node scripts/cards/prepare-media.mjs <id> <dark-copy> <light-copy> [logo-copy] \
//     [--logo-sha256=<source-hash>] [--sharp-module=/existing/node_modules/sharp]
// Inputs must already be copied inside TJN_MEDIA_WORK. Outputs are new job files
// assets/cards/src/<id>-{dark,light}.jpg (1000px, q80) and <id>-logo.png (128px).
// Never pass an unsanitized private screenshot. Source logos are copy-only:
// check the staged logo against the source SHA256 before deriving a new PNG.
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mediaWork, cardId, readWorkFile, outputPlan, writeOutputs } from "./media-work.mjs";

const job = mediaWork();
const args = [];
let sharpModule;
let logoHash;
for (const arg of process.argv.slice(2)) {
  if (arg.startsWith("--sharp-module=")) {
    if (sharpModule !== undefined) throw new Error("Duplicate --sharp-module.");
    sharpModule = arg.slice("--sharp-module=".length);
    if (!isAbsolute(sharpModule)) throw new Error("--sharp-module must be an existing absolute module path.");
  } else if (arg.startsWith("--logo-sha256=")) {
    if (logoHash !== undefined) throw new Error("Duplicate --logo-sha256.");
    logoHash = arg.slice("--logo-sha256=".length).toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(logoHash)) throw new Error("--logo-sha256 requires a source SHA256.");
  } else if (arg.startsWith("--")) {
    throw new Error(`Unknown option: ${arg}`);
  } else {
    args.push(arg);
  }
}
if (args.length < 3 || args.length > 4) {
  throw new Error("Usage: prepare-media.mjs <id> <dark-copy> <light-copy> [logo-copy] [--logo-sha256=<source-hash>] [--sharp-module=<existing-absolute-path>]");
}
const [id, darkShot, lightShot, logo] = args;
cardId(id);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const { cards } = JSON.parse(readFileSync(join(root, "showcase/projects.json"), "utf8"));
if (!Array.isArray(cards)) throw new Error("projects.json must contain a cards array.");
const ids = cards.map((p) => cardId(p?.id));
if (new Set(ids).size !== ids.length) throw new Error("Duplicate projects.json card IDs.");
if (!ids.includes(id)) throw new Error(`Unknown card ID: ${id}`);
if (Boolean(logo) !== Boolean(logoHash)) {
  throw new Error("A logo copy requires --logo-sha256 from its source, and vice versa.");
}

// Preflight every path and read every staged input before invoking Sharp or writing.
const names = [`assets/cards/src/${id}-dark.jpg`, `assets/cards/src/${id}-light.jpg`];
if (logo) names.push(`assets/cards/src/${id}-logo.png`);
const outputs = outputPlan(job, names);
const shots = [readWorkFile(job, darkShot), readWorkFile(job, lightShot)];
const logoBuf = logo ? readWorkFile(job, logo) : null;
if (logoBuf && createHash("sha256").update(logoBuf).digest("hex") !== logoHash) {
  throw new Error("Staged logo SHA256 does not match the source hash.");
}

// Resolve only an already installed Sharp. No installation, browser or fallback renderer.
const require = createRequire(import.meta.url);
const sharp = require(sharpModule ?? "sharp");
if (typeof sharp !== "function") throw new Error("Selected module does not export Sharp.");
const buffers = [];
for (const shot of shots) {
  buffers.push(await sharp(shot, { failOn: "warning" })
    .resize({ width: 1000 })
    .flatten({ background: "#000000" })
    .jpeg({ quality: 80 })
    .toBuffer());
}
if (logoBuf) {
  buffers.push(await sharp(logoBuf, { failOn: "warning" }).resize({ width: 128 }).png().toBuffer());
}
// All encodes succeed before exclusive creation; existing inputs/outputs are never overwritten.
writeOutputs(job, outputs, buffers);
