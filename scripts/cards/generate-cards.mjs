#!/usr/bin/env node
// Generate the "Selected Projects & Systems" cards for the profile README.
//
//   node scripts/cards/generate-cards.mjs --card=<id> [--card=<id> ...]
//
// Run only through desk-run.ps1 on TJN-DESK. Reads canonical
// showcase/projects.json and staged TJN_MEDIA_WORK/assets/cards/src/ inputs
// (fonts, <id>-dark.jpg, <id>-light.jpg, optional <id>-logo.png).
// Writes only selected assets/cards/<id>-{dark,light}.svg inside that job.
// Stage asset copies first; source logos are copy-only and SHA256-checked.
// No dependencies. See scripts/cards/README.md.
//
// Design: B+C hybrid matched to travisjneuman.com project cards: zinc
// palette, Geist / Geist Mono, category + status pills, three metric tiles,
// mono tag chips, and a live screenshot in a browser frame on a per-project
// accent glow. Fonts and images are embedded so GitHub renders the SVG
// exactly like a PNG while text stays sharp at any size.
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mediaWork, cardId, xmlText, readWorkFile, outputPlan, writeOutputs } from "./media-work.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const job = mediaWork();
const selectedIds = process.argv.slice(2).map((arg) => {
  if (!arg.startsWith("--card=")) throw new Error("Usage: generate-cards.mjs --card=<id> [--card=<id> ...]");
  return cardId(arg.slice("--card=".length));
});
if (!selectedIds.length || new Set(selectedIds).size !== selectedIds.length) {
  throw new Error("Select at least one card; duplicate selections are forbidden.");
}
const { cards } = JSON.parse(readFileSync(join(root, "showcase/projects.json"), "utf8"));
if (!Array.isArray(cards)) throw new Error("projects.json must contain a cards array.");
const byId = new Map();
for (const p of cards) {
  const id = cardId(p?.id);
  if (byId.has(id)) throw new Error(`Duplicate projects.json card ID: ${id}`);
  byId.set(id, p);
}
const selected = selectedIds.map((id) => {
  if (!byId.has(id)) throw new Error(`Unknown card ID: ${id}`);
  return byId.get(id);
});
const themes = ["dark", "light"];
const outputs = outputPlan(job, selected.flatMap((p) => themes.map((theme) => `assets/cards/${p.id}-${theme}.svg`)));

const W = 1280;
const H = 720;
const LEFT = 64;
const TEXT_MAX = 540; // left column ends before the browser frame (x=620)

const THEMES = {
  dark: {
    bg: "#09090b", border: "#27272a", fg: "#fafafa", muted: "#a1a1aa",
    tile: "#18181b", tileBorder: "#27272a", chip: "#18181b", chipBorder: "#3f3f46",
    frame: "#18181b", bar: "#27272a", glow: 0.55, shadow: 0.6,
  },
  light: {
    bg: "#ffffff", border: "#e4e4e7", fg: "#09090b", muted: "#52525b",
    tile: "#f4f4f5", tileBorder: "#e4e4e7", chip: "#ffffff", chipBorder: "#d4d4d8",
    frame: "#ffffff", bar: "#f4f4f5", glow: 0.28, shadow: 0.18,
  },
};

// Shared status vocabulary (matches tjn.portfolio projectStatusLabels).
const STATUS = {
  live: { label: "Live", dark: "#22c55e", light: "#15803d" },
  active: { label: "Active", dark: "#3b82f6", light: "#1d4ed8" },
  development: { label: "In development", dark: "#a855f7", light: "#7e22ce" },
  paused: { label: "Paused", dark: "#f59e0b", light: "#b45309" },
  maintained: { label: "Maintained", dark: "#14b8a6", light: "#0f766e" },
  retired: { label: "Retired", dark: "#a1a1aa", light: "#52525b" },
};

// Reject malformed selected presentation data before reading assets or writing outputs.
for (const p of selected) {
  for (const field of ["title", "category", "url", "alt"]) xmlText(p[field], `${p.id}.${field}`);
  if (!Object.hasOwn(STATUS, p.status)) throw new Error(`Unknown status for ${p.id}`);
  if (!Array.isArray(p.accent) || p.accent.length !== 2 || p.accent.some((c) => !/^#[0-9a-f]{6}$/i.test(c))) {
    throw new Error(`Invalid accent colors for ${p.id}`);
  }
  if (!Array.isArray(p.lines) || !p.lines.length || !Array.isArray(p.tags) ||
      !Array.isArray(p.metrics) || p.metrics.length !== 3) {
    throw new Error(`Invalid card presentation arrays for ${p.id}`);
  }
  for (const text of [...p.lines, ...p.tags]) xmlText(text, `${p.id} line/tag`);
  for (const metric of p.metrics) {
    if (!Array.isArray(metric) || metric.length !== 2) throw new Error(`Invalid metric for ${p.id}`);
    metric.forEach((text) => xmlText(text, `${p.id} metric`));
  }
  if (p.shotFocus !== undefined && !["center", "left"].includes(p.shotFocus)) {
    throw new Error(`Invalid shotFocus for ${p.id}`);
  }
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
const font = readWorkFile(job, "assets/cards/src/fonts/Geist-Variable.woff2").toString("base64");
const mono = readWorkFile(job, "assets/cards/src/fonts/GeistMono-Variable.woff2").toString("base64");
const media = new Map();
for (const p of selected) {
  const shots = Object.fromEntries(themes.map((theme) => {
    const buf = readWorkFile(job, `assets/cards/src/${p.id}-${theme}.jpg`);
    return [theme, { buf, size: jpegSize(buf) }];
  }));
  const logo = readWorkFile(job, `assets/cards/src/${p.id}-logo.png`, true);
  if (logo && !logo.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    throw new Error(`Invalid staged PNG logo for ${p.id}`);
  }
  media.set(p.id, { shots, logo: logo?.toString("base64") ?? null });
}

// Width estimates (em per character) for auto-fitting text without a layout engine.
const SANS_BOLD = 0.6;
const SANS = 0.5;
const MONO = 0.6;
// Pixel size of a JPEG (first SOFn marker).
function jpegSize(buf) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) throw new Error("Not a JPEG");
  let i = 2;
  while (i < buf.length) {
    if (buf[i++] !== 0xff) break;
    while (buf[i] === 0xff) i++;
    const marker = buf[i++];
    if (marker === undefined || marker === 0xda || marker === 0xd9) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (i + 2 > buf.length) break;
    const len = buf.readUInt16BE(i);
    if (len < 2 || i + len > buf.length) break;
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      if (len < 8) break;
      const h = buf.readUInt16BE(i + 3);
      const w = buf.readUInt16BE(i + 5);
      if (w && h) return { h, w };
      break;
    }
    i += len;
  }
  throw new Error("JPEG lacks a valid frame size");
}

// Browser window geometry. The frame bleeds past the card's right edge, so
// only x 620..1280 of the 840px window is visible.
const WIN = { x: 620, y: 210, w: 840, h: 560, visibleCenter: 950 };

const fit = (text, max, size, em) => Math.min(size, Math.floor(max / (text.length * em)));

function pill(x, y, text, size, fill, stroke, color, opts = {}) {
  const pad = opts.dot ? 44 : 34;
  const w = Math.round(text.length * size * MONO + text.length * 0.5 + pad);
  const dot = opts.dot
    ? `<circle cx="${x + 18}" cy="${y + 17}" r="5" fill="${color}"/>`
    : "";
  const tx = opts.dot ? x + 30 : x + 17;
  return {
    w,
    svg: `<rect x="${x}" y="${y}" width="${w}" height="34" rx="17" fill="${fill}"${stroke ? ` stroke="${stroke}"` : ""}${opts.fillOpacity ? ` fill-opacity="${opts.fillOpacity}"` : ""}/>${dot}<text x="${tx}" y="${y + 22}" class="m" font-size="${size}" font-weight="${opts.weight || 400}" fill="${color}" letter-spacing=".5">${esc(text)}</text>`,
  };
}

function card(p, theme) {
  const t = THEMES[theme];
  const status = STATUS[p.status];
  const statusColor = status[theme];
  const { shots, logo } = media.get(p.id);
  const shot = shots[theme].buf.toString("base64");
  const { w: sw, h: sh } = shots[theme].size;
  const scale = Math.max(WIN.w / sw, WIN.h / sh);
  const shotW = Math.round(sw * scale);
  const shotH = Math.round(sh * scale);
  // "center" keeps centered layouts readable inside the visible part of the window
  const shotX = p.shotFocus === "center" ? Math.round(WIN.visibleCenter - shotW / 2) : WIN.x;
  const cat = pill(LEFT, 64, p.category.toUpperCase(), 15, t.tile, t.tileBorder, t.muted);
  const stat = pill(LEFT + cat.w + 10, 64, status.label.toUpperCase(), 15, statusColor, null, statusColor, {
    dot: true, weight: 600, fillOpacity: 0.14,
  });

  const titleSize = fit(p.title, TEXT_MAX, 72, SANS_BOLD);
  const lineSize = Math.min(...p.lines.map((l) => fit(l, TEXT_MAX, 25, SANS)));

  const tiles = p.metrics
    .map(([value, label], i) => {
      const x = LEFT + i * 170;
      const vSize = fit(value, 120, 40, 0.62);
      return `<rect x="${x}" y="438" width="158" height="112" rx="16" fill="${t.tile}" stroke="${t.tileBorder}"/><text x="${x + 22}" y="496" class="s" font-size="${vSize}" font-weight="650" fill="${t.fg}" letter-spacing="-1">${esc(value)}</text><text x="${x + 22}" y="528" class="m" font-size="${fit(label.toUpperCase(), 120, 15, 0.66)}" fill="${t.muted}" letter-spacing="1">${esc(label.toUpperCase())}</text>`;
    })
    .join("");

  let x = LEFT;
  const chips = [];
  for (const tag of p.tags) {
    const w = Math.round(tag.length * 17 * MONO + 30);
    if (x + w > LEFT + TEXT_MAX) break;
    chips.push(`<rect x="${x}" y="584" width="${w}" height="40" rx="20" fill="${t.chip}" stroke="${t.chipBorder}"/><text x="${x + w / 2}" y="610" text-anchor="middle" class="m" font-size="17" fill="${t.muted}">${esc(tag)}</text>`);
    x += w + 10;
  }

  const logoSvg = logo
    ? `<image x="${LEFT}" y="134" width="220" height="64" preserveAspectRatio="xMinYMid meet" href="data:image/png;base64,${logo}"/>`
    : "";
  const urlW = Math.round(p.url.length * 14 * MONO + 36);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" text-rendering="geometricPrecision" role="img" aria-label="${esc(p.alt)}">
<title>${esc(p.alt)}</title>
<style>@font-face{font-family:G;src:url(data:font/woff2;base64,${font})}@font-face{font-family:GM;src:url(data:font/woff2;base64,${mono})}.s{font-family:G,system-ui,sans-serif}.m{font-family:GM,ui-monospace,monospace}</style>
<defs>
<clipPath id="card"><rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="28"/></clipPath>
<clipPath id="win"><rect x="620" y="210" width="840" height="560"/></clipPath>
<radialGradient id="glow" cx="0.8" cy="0.25" r="0.75"><stop offset="0" stop-color="${p.accent[0]}" stop-opacity="${t.glow}"/><stop offset="0.45" stop-color="${p.accent[1]}" stop-opacity="${t.glow * 0.6}"/><stop offset="1" stop-color="${p.accent[1]}" stop-opacity="0"/></radialGradient>
<filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="24" stdDeviation="28" flood-color="#000" flood-opacity="${t.shadow}"/></filter>
</defs>
<g clip-path="url(#card)">
<rect width="${W}" height="${H}" fill="${t.bg}"/><rect width="${W}" height="${H}" fill="url(#glow)"/>
<g filter="url(#sh)"><rect x="620" y="170" width="840" height="620" rx="16" fill="${t.frame}" stroke="${t.border}"/></g>
<rect x="620" y="170" width="840" height="40" rx="16" fill="${t.bar}"/><rect x="620" y="194" width="840" height="16" fill="${t.bar}"/>
<circle cx="646" cy="190" r="6.5" fill="#ff5f57"/><circle cx="668" cy="190" r="6.5" fill="#febc2e"/><circle cx="690" cy="190" r="6.5" fill="#28c840"/>
<rect x="720" y="178" width="${urlW}" height="24" rx="8" fill="${t.bg}" opacity=".7"/><text x="738" y="195" class="m" font-size="14" fill="${t.muted}">${esc(p.url)}</text>
<g clip-path="url(#win)"><image x="${shotX}" y="${WIN.y}" width="${shotW}" height="${shotH}" preserveAspectRatio="none" href="data:image/jpeg;base64,${shot}"/></g>
${cat.svg}${stat.svg}
${logoSvg}
<text x="${LEFT}" y="292" class="s" font-size="${titleSize}" font-weight="700" letter-spacing="-2" fill="${t.fg}">${esc(p.title)}</text>
${p.lines.map((l, i) => `<text x="${LEFT}" y="${348 + i * 34}" class="s" font-size="${lineSize}" fill="${t.muted}">${esc(l)}</text>`).join("")}
${tiles}${chips.join("")}
</g>
<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="28" fill="none" stroke="${t.border}" stroke-width="2"/>
</svg>
`;
}

// Build every selected theme in memory first. No output is opened until all succeed.
const buffers = selected.flatMap((p) => themes.map((theme) => {
  const svg = card(p, theme);
  xmlText(svg, `${p.id}-${theme}.svg`);
  return Buffer.from(svg, "utf8");
}));
writeOutputs(job, outputs, buffers);
