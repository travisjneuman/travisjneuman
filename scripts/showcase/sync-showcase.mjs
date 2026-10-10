#!/usr/bin/env node
// Copy reviewed facts, never execute their source metadata or measure counts.
// Offline by default. See showcase/README.md for sources, templates and privacy.
import { readFileSync, writeFileSync, existsSync, statSync, lstatSync, fstatSync, readSync, realpathSync, constants, renameSync, unlinkSync, openSync, closeSync } from "node:fs";
import { homedir } from "node:os";
import { createHash } from "node:crypto";
import { basename, dirname, join, resolve, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const registry = readJson(join(root, "showcase/registry.json"));
const schema = readJson(join(root, "showcase/schema/showcase-v1.json"));
const flags = new Set();
const overrides = new Map();
const denylistUrlFiles = new Map();
const publicFiles = new Set();
const MAX_PUBLIC_FILES = 32;
const MAX_PUBLIC_FILE_BYTES = 8 * 1024 * 1024;
for (const arg of process.argv.slice(2)) {
  if (arg.startsWith("--source-file=")) {
    const match = /^--source-file=([a-z0-9-]+)=(.+)$/.exec(arg);
    if (!match || !Object.hasOwn(registry.sources, match[1]) || !isAbsolute(match[2]) || overrides.has(match[1])) {
      throw new Error("Use one --source-file=id=/absolute/existing/showcase.json per registered id");
    }
    try { if (!statSync(match[2]).isFile()) throw new Error(); }
    catch { throw new Error(`${match[1]}: source override must be an existing readable file`); }
    overrides.set(match[1], match[2]);
  } else if (arg.startsWith("--denylist-url-file=")) {
    const match = /^--denylist-url-file=([1-9]\d*)=(.+)$/.exec(arg);
    const index = match ? Number(match[1]) : NaN;
    if (!match || !Number.isSafeInteger(index) || index > 8 || !isAbsolute(match[2]) || denylistUrlFiles.has(index)) {
      throw new Error("Use one --denylist-url-file=position=/absolute/existing/file per configured privacy URL position (1 to 8)");
    }
    denylistUrlFiles.set(index, match[2]);
  } else if (arg.startsWith("--public-file=")) {
    const path = arg.slice("--public-file=".length);
    if (!isAbsolute(path) || publicFiles.has(resolve(path)) || publicFiles.size >= MAX_PUBLIC_FILES) {
      throw new Error("Use up to 32 distinct --public-file=/absolute/existing/file selections");
    }
    publicFiles.add(resolve(path));
  } else if (["--check", "--profile-only", "--allow-remote-sources", "--allow-remote-denylist"].includes(arg)) flags.add(arg);
  else throw new Error("Unknown option; see showcase/README.md (privacy cannot be disabled)");
}
const CHECK = flags.has("--check");
const portfolioPath = resolve(root, "..", "tjn.portfolio", "src/lib/data/showcase.generated.ts");
if (!flags.has("--profile-only") && !existsSync(join(dirname(portfolioPath), "projects.ts"))) {
  throw new Error("Missing intended portfolio sibling src/lib/data/projects.ts; restore the existing checkout or explicitly use --profile-only");
}

// Dependency-free enforcement of the checked-in source schema. Errors identify
// fields, never echo potentially private input values or source locations.
function validate(value, rule, field) {
  const fail = (reason) => { throw new Error(`${field}: ${reason}`); };
  const type = value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
  if (rule.type && ![rule.type].flat().includes(type)) fail("invalid type");
  if (rule.enum && !rule.enum.includes(value)) fail("invalid enum value");
  if (typeof value === "string") {
    if (rule.maxLength !== undefined && [...value].length > rule.maxLength) fail("too long");
    if (rule.minLength !== undefined && value.trim().length < rule.minLength) fail("empty string");
    if (rule.pattern && !new RegExp(rule.pattern).test(value)) fail("invalid format");
    if (rule.format === "date") {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) fail("invalid date");
    }
    if (rule.format === "uri") {
      try { const url = new URL(value); if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) fail("invalid public URL"); }
      catch { fail("invalid public URL"); }
    }
  }
  if (Array.isArray(value)) {
    if (rule.minItems !== undefined && value.length < rule.minItems) fail("too few items");
    value.forEach((item, i) => validate(item, rule.items ?? {}, `${field}[${i}]`));
  } else if (value && typeof value === "object") {
    for (const key of rule.required ?? []) if (!Object.hasOwn(value, key)) fail(`missing ${key}`);
    for (const [key, item] of Object.entries(value)) {
      if (Object.hasOwn(rule.properties ?? {}, key)) validate(item, rule.properties[key], `${field}.${key}`);
      else if (rule.additionalProperties === false) fail("unknown field");
      else if (typeof rule.additionalProperties === "object") validate(item, rule.additionalProperties, `${field}.provenance`);
    }
  }
}
function validateRounding(metric, field) {
  if (metric.round === "exact") return; // exact may be a version, cost or text
  const match = /^(0|[1-9]\d*|[1-9]\d{0,2}(?:,\d{3})+)\+$/.exec(metric.value);
  if (!match) throw new Error(`${field}: rounded values require an integer lower bound followed by +`);
  const n = Number(match[1].replaceAll(",", ""));
  const step = metric.round === "floor-100" ? 100 : 10 ** Math.max(0, Math.floor(Math.log10(n)) - 1);
  if (!Number.isSafeInteger(n) || (n === 0 && metric.round !== "floor-100") || n % step !== 0) throw new Error(`${field}: rendered lower bound violates its rounding rule`);
  // This validates only the stored display, not the unmeasured raw population.
}
const MAX_JSON_BYTES = 2 * 1024 * 1024;
async function fetchJson(url, label) {
  try {
    const res = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error();
    const chunks = [];
    let size = 0;
    for await (const chunk of res.body) {
      size += chunk.length;
      if (size > MAX_JSON_BYTES) throw new Error();
      chunks.push(chunk);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch { throw new Error(`${label}: remote JSON unavailable; supply a reviewed local file`); }
}
function localJsonBytes(path, label) {
  let fd;
  try {
    fd = openSync(path, constants.O_RDONLY | constants.O_NONBLOCK);
    const stat = fstatSync(fd);
    if (!stat.isFile() || stat.size > MAX_JSON_BYTES) throw new Error();
    const chunks = [];
    let size = 0;
    for (;;) {
      const chunk = Buffer.alloc(Math.min(64 * 1024, MAX_JSON_BYTES + 1 - size));
      const n = readSync(fd, chunk, 0, chunk.length, null);
      if (!n) break;
      size += n;
      if (size > MAX_JSON_BYTES) throw new Error();
      chunks.push(chunk.subarray(0, n));
    }
    return Buffer.concat(chunks);
  } catch { throw new Error(`${label}: local JSON unavailable or invalid; supply a reviewed existing file`); }
  finally { if (fd !== undefined) closeSync(fd); }
}
function localJson(path, label, expectedSha256) {
  const bytes = localJsonBytes(path, label);
  // Authenticate the original bounded read, before decoding (including any BOM).
  // Never hash a JSON serialization or reopen the file for the adapted traversal.
  if (expectedSha256 !== undefined && createHash("sha256").update(bytes).digest("hex") !== expectedSha256) {
    throw new Error("Reviewed privacy registry snapshot mismatch; renewed review required");
  }
  try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
  catch { throw new Error(`${label}: local JSON unavailable or invalid; supply a reviewed existing file`); }
}
// Private, owner-reviewed policy only; absence retains ordinary full protection.
// This wire contract is shared with the independent Claude collector, not its
// implementation or checkout. Never publish policy contents or private paths.
// Bind this adapter version to the approved snapshot, not arbitrary future pins.
const REVIEWED_REGISTRY_SHA256 = "8f6cef0da8d631305848a2e66422f1c9f14f9b97af7c8b8f052127f8abaaf4fa";
function reviewedRegistryPin() {
  const path = join(homedir(), ".config/showcase/reviewed-registry.json");
  try { lstatSync(path); }
  catch (error) {
    if (error.code === "ENOENT") return null;
    throw new Error("Reviewed privacy registry policy unavailable or invalid; renewed review required");
  }
  try {
    const pin = localJson(path, "Privacy policy");
    const keys = ["schemaVersion", "urlSlot", "basename", "sha256", "adapter"];
    if (!pin || typeof pin !== "object" || Array.isArray(pin) || Object.keys(pin).length !== keys.length ||
        !keys.every((key) => Object.hasOwn(pin, key)) || pin.schemaVersion !== 1 || pin.urlSlot !== 1 ||
        pin.basename !== "franchises.json" || pin.adapter !== "unidentified-manager-v1" ||
        pin.sha256 !== REVIEWED_REGISTRY_SHA256) throw new Error();
    return pin;
  } catch { throw new Error("Reviewed privacy registry policy unavailable or invalid; renewed review required"); }
}
function unidentifiedManagerScalars(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      !Object.hasOwn(value, "franchises") || !Array.isArray(value.franchises)) {
    throw new Error("Reviewed privacy registry root changed; renewed review required");
  }
  const omitted = new WeakSet();
  const fields = ["id", "slug", "name", "displayName", "managerAliases", "teamAliases", "primaryColor", "secondaryColor"];
  const meaningful = (v) => typeof v === "string" && v.trim().length > 0 && /[\p{L}\p{N}]/u.test(v);
  for (const record of value.franchises) {
    // Changed/unknown record shapes gain no exemption: the normal walker still
    // protects their name/alias strings, nested properties and unrelated fields.
    if (!record || typeof record !== "object" || Array.isArray(record) ||
        !fields.every((key) => Object.hasOwn(record, key)) ||
        ![record.id, record.slug, record.displayName].every(meaningful) ||
        typeof record.name !== "string" || record.name.toLowerCase() !== "unknown" ||
        typeof record.primaryColor !== "string" || !record.primaryColor.trim() ||
        typeof record.secondaryColor !== "string" || !record.secondaryColor.trim() ||
        !Array.isArray(record.managerAliases) || record.managerAliases.length !== 0 ||
        !Array.isArray(record.teamAliases) || record.teamAliases.length === 0 ||
        !record.teamAliases.every(meaningful)) continue;
    omitted.add(record);
  }
  return omitted;
}
async function loadFacts(id, source) {
  if (overrides.has(id)) return localJson(overrides.get(id), id);
  if (source.local) return localJson(join(root, source.local), id);
  if (!/^travisjneuman\/[a-zA-Z0-9._-]+$/.test(source.repo ?? "") || !/^[a-zA-Z0-9._-]+$/.test(source.branch ?? "")) throw new Error(`${id}: invalid public source configuration`);
  const sibling = resolve(root, "..", source.repo.split("/")[1], "showcase.json");
  if (existsSync(sibling)) return localJson(sibling, id);
  if (!flags.has("--allow-remote-sources")) throw new Error(`${id}: missing local facts; supply --source-file=${id}=/absolute/existing/showcase.json (offline default)`);
  return fetchJson(`https://raw.githubusercontent.com/${source.repo}/${source.branch}/showcase.json`, id);
}
const facts = Object.create(null);
for (const [id, source] of Object.entries(registry.sources)) {
  const f = await loadFacts(id, source);
  validate(f, schema, id);
  if (f.id !== id) throw new Error(`${id}: facts id mismatch`);
  const keys = new Set();
  f.metrics.forEach((m, i) => {
    validateRounding(m, `${id}.metrics[${i}]`);
    if (m.key && keys.has(m.key)) throw new Error(`${id}: duplicate metric key`);
    if (m.key) keys.add(m.key);
  });
  facts[id] = f;
}
function metricRef(ref, owner) {
  if (!ref || typeof ref !== "object" || Array.isArray(ref) || Object.keys(ref).some((key) => !["facts", "key", "index", "label", "expectLabel"].includes(key))) throw new Error(`${owner}: invalid explicit metric reference`);
  const f = facts[ref.facts];
  const hasKey = Object.hasOwn(ref, "key");
  if (!f || (hasKey === Object.hasOwn(ref, "index")) || (hasKey && (typeof ref.key !== "string" || !/^[a-z][a-z0-9-]*$/.test(ref.key)))) throw new Error(`${owner}: metric reference requires exactly one valid key or index`);
  const m = hasKey ? f.metrics.find((item) => item.key === ref.key) : (Number.isInteger(ref.index) && ref.index >= 0 ? f.metrics[ref.index] : undefined);
  if (!m) throw new Error(`${owner}: unresolved metric reference for ${ref.facts}`);
  if (ref.expectLabel !== undefined && (typeof ref.expectLabel !== "string" || ref.expectLabel !== m.label)) throw new Error(`${owner}: canonical metric label mismatch`);
  if (ref.label !== undefined && (typeof ref.label !== "string" || !ref.label.trim())) throw new Error(`${owner}: invalid display label`);
  return { ...m, facts: ref.facts, label: ref.label ?? m.label, canonicalLabel: m.label };
}
// A tiny explicit template language, not evaluation. Existing mN/vN templates
// and index refs remain supported. lN uses the displayed label; wN/WN spell
// small exact integers in lowercase/title case for the existing prose tone.
const words = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen", "Twenty"];
function template(text, metrics, owner) {
  if (typeof text !== "string") throw new Error(`${owner}: expected template string`);
  const rendered = text.replace(/\{([mvlwWd])(\d+)\}/g, (_, mode, index) => {
    const m = metrics[Number(index)];
    if (!m) throw new Error(`${owner}: unresolved template reference`);
    if (mode === "v") return m.value;
    if (mode === "l") return m.label;
    if (mode === "d") return m.asOf;
    if (mode === "w" || mode === "W") {
      if (m.round !== "exact" || !/^(0|[1-9]\d*)$/.test(m.value) || !words[Number(m.value)]) throw new Error(`${owner}: word template requires an exact integer from 0 to 20`);
      return mode === "w" ? words[Number(m.value)].toLowerCase() : words[Number(m.value)];
    }
    return `${m.value} ${m.label.toLowerCase()}`;
  });
  if (/[{}]/.test(rendered)) throw new Error(`${owner}: unresolved template syntax`);
  return rendered;
}
const cards = registry.cards.map((c) => {
  const f = facts[c.facts];
  if (!f) throw new Error(`${c.id}: missing card facts`);
  const refs = c.metrics ?? [0, 1, 2].map((index) => ({ facts: c.facts, index }));
  const metricFacts = refs.map((ref) => metricRef(ref, c.id));
  const card = {
    id: c.id, title: c.title, category: c.category, status: f.status,
    accent: c.accent, lines: c.lines.map((line) => template(line, metricFacts, c.id)),
    metrics: metricFacts.map((m) => [m.value, m.label]), metricFacts,
    facts: c.facts, updated: f.updated, ...(f.provenance ? { provenance: f.provenance } : {}),
    tags: c.tags ?? f.stack.slice(0, 4), url: c.url,
    alt: template(c.alt, metricFacts, c.id), anchor: c.anchor,
  };
  if (c.shotFocus) card.shotFocus = c.shotFocus;
  return card;
});
const latest = Object.values(facts).map((f) => f.updated).sort().at(-1);
const projectsJson = JSON.stringify({
  $comment: "GENERATED by scripts/showcase/sync-showcase.mjs. Edit sources and registry, not this file. updated is the latest source document date, not a refresh timestamp. Card metrics remain tuples for the renderer; metricFacts and facts retain canonical evidence.",
  updated: latest, facts, cards,
}, null, 2) + "\n";
const STATUS_LABEL = { live: "Live", active: "Active", development: "In development", paused: "Paused", maintained: "Maintained", retired: "Retired" };
const statusCell = (f) => STATUS_LABEL[f.status] + (f.statusNote ? ` (${f.statusNote})` : "");
const htmlAttribute = (s) => s.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const cardsBlock = [
  "<!-- showcase:cards:start (generated by scripts/showcase/sync-showcase.mjs) -->", "<table>",
  ...cards.reduce((rows, c, i) => {
    if (i % 2 === 0) rows.push("  <tr>");
    rows.push('    <td width="50%">', `      <a href="${htmlAttribute(c.anchor)}"><picture>`,
      `        <source media="(prefers-color-scheme: dark)" srcset="./assets/cards/${c.id}-dark.svg">`,
      `        <img src="./assets/cards/${c.id}-light.svg" alt="${htmlAttribute(c.alt)}" width="100%">`, "      </picture></a>", "    </td>");
    if (i % 2 === 1 || i === cards.length - 1) rows.push("  </tr>");
    return rows;
  }, []), "</table>", "<!-- showcase:cards:end -->",
].join("\n");
const tableBlock = [
  "<!-- showcase:table:start (generated by scripts/showcase/sync-showcase.mjs) -->",
  "| Project | Status | What it is | Links |", "|---------|--------|---------------|-------|",
  ...registry.table.map((row, i) => {
    const f = facts[row.facts[0]];
    if (!f) throw new Error(`table[${i}]: missing facts`);
    const metrics = (row.metrics ?? []).map((ref) => metricRef(ref, `table[${i}]`));
    return `| ${row.project} | ${[statusCell(f), row.badges].filter(Boolean).join(" · ")} | ${template(row.what, metrics, `table[${i}]`)} | ${row.links} |`;
  }), "<!-- showcase:table:end -->",
].join("\n");
function replaceRegion(text, name, block) {
  const start = `<!-- showcase:${name}:start[^>]*-->`;
  const end = `<!-- showcase:${name}:end -->`;
  const re = new RegExp(`${start}[\\s\\S]*?${end}`, "g");
  if ([...text.matchAll(new RegExp(start, "g"))].length !== 1 || [...text.matchAll(new RegExp(end, "g"))].length !== 1 || [...text.matchAll(re)].length !== 1) {
    throw new Error(`README.md requires exactly one showcase:${name} region`);
  }
  return text.replace(re, () => block);
}
const readmePath = join(root, "README.md");
const readmeOld = readFileSync(readmePath, "utf8");
let readmeNew = replaceRegion(replaceRegion(readmeOld, "cards", cardsBlock), "table", tableBlock);
const proseIds = new Set();
for (const region of registry.prose ?? []) {
  if (!region || typeof region.id !== "string" || !/^[a-z0-9-]+$/.test(region.id) || proseIds.has(region.id) || !Array.isArray(region.metrics)) throw new Error("Invalid or duplicate registry prose region");
  proseIds.add(region.id);
  const owner = `prose-${region.id}`;
  const metrics = region.metrics.map((ref) => metricRef(ref, owner));
  const block = [
    `<!-- showcase:${owner}:start (generated by scripts/showcase/sync-showcase.mjs) -->`,
    template(region.text, metrics, owner),
    `<!-- showcase:${owner}:end -->`,
  ].join("\n");
  readmeNew = replaceRegion(readmeNew, owner, block);
}
const portfolioFacts = Object.fromEntries(Object.values(facts)
  .filter((f) => registry.sources[f.id].portfolio !== false)
  .map((f) => [f.id, { status: f.status, statusNote: f.statusNote ?? null, updated: f.updated,
    ...(f.provenance ? { provenance: f.provenance } : {}), metrics: f.metrics }]));
const portfolioJson = `/**
 * GENERATED by travisjneuman/scripts/showcase/sync-showcase.mjs.
 * Latest source document date: ${latest}; not a new measurement date.
 * Do not edit: change the project's showcase.json and re-run the sync.
 */
import type { ProjectStatus } from "./projects";

export interface ShowcaseMetric {
  key?: string;
  label: string;
  value: string;
  source: string;
  round: "exact" | "floor-2sig" | "floor-100";
  asOf: string;
  provenance?: Record<string, unknown>;
}
export interface ShowcaseFacts {
  status: ProjectStatus;
  statusNote: string | null;
  updated: string;
  provenance?: Record<string, unknown>;
  metrics: ShowcaseMetric[];
}
export const showcaseFacts: Record<string, ShowcaseFacts> = ${JSON.stringify(portfolioFacts, null, 2)};
`;

// Fail closed, including unreadable explicitly configured privacy inputs.
// Local JSON selection uses the same name/alias traversal as the old URL lane.
async function loadDenylist() {
  const terms = new Set();
  const file = process.env.SHOWCASE_DENYLIST ?? join(homedir(), ".config/showcase/denylist.txt");
  if (process.env.SHOWCASE_DENYLIST || existsSync(file)) {
    let text;
    try { if (statSync(file).size > MAX_JSON_BYTES) throw new Error(); text = readFileSync(file, "utf8"); }
    catch { throw new Error("Privacy denylist file unavailable; refusing to publish"); }
    for (const line of text.split("\n")) { const t = line.trim(); if (t && !t.startsWith("#")) terms.add(t); }
  }
  const allow = new Set(["travis", "neuman", "travis neuman", "travis j. neuman", "travisjneuman"]);
  const usable = (t) => t.length >= 3 && !allow.has(t.toLowerCase());
  const pin = reviewedRegistryPin();
  const jsonTerms = (value, reviewedRegistry = false) => {
    const collected = new Set();
    const omitted = reviewedRegistry ? unidentifiedManagerScalars(value) : new WeakSet();
    const walk = (v, key = "", parent = null) => {
      if (typeof v === "string" && key === "name" && parent && omitted.has(parent)) return;
      if (typeof v === "string" && /name|alias/i.test(key)) collected.add(v.replace(/[^\p{L}\p{N}&.'\- ]/gu, "").trim());
      else if (Array.isArray(v)) v.forEach((x) => walk(x, key));
      else if (v && typeof v === "object") Object.entries(v).forEach(([k, x]) => walk(x, k, v));
    };
    walk(value);
    return [...collected].filter(usable);
  };
  const files = (process.env.SHOWCASE_DENYLIST_JSON_FILES ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const urls = (process.env.SHOWCASE_DENYLIST_JSON_URLS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (files.length + urls.length > 8) throw new Error("Privacy JSON sources exceed the bounded limit of 8");
  const parsedUrls = urls.map((url) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:" || parsed.username || parsed.password) throw new Error();
      return parsed;
    } catch { throw new Error("Privacy remote source requires an HTTPS URL without credentials"); }
  });
  if (pin && (!parsedUrls[pin.urlSlot - 1] || !denylistUrlFiles.has(pin.urlSlot) ||
      parsedUrls[pin.urlSlot - 1].pathname.split("/").at(-1) !== pin.basename ||
      basename(denylistUrlFiles.get(pin.urlSlot)) !== pin.basename)) {
    throw new Error("Reviewed privacy registry requires its configured local URL-slot counterpart; renewed review required");
  }
  // A mapping selects an explicitly reviewed counterpart, never removes a slot.
  // Filename equality is necessary, not proof of caller-reviewed equivalence.
  for (const [index, path] of denylistUrlFiles) {
    if (index > urls.length) throw new Error("Privacy URL file selection references an unconfigured position");
    if (parsedUrls[index - 1].pathname.split("/").at(-1) !== basename(path)) throw new Error("Privacy URL file selection requires exactly matching source filenames");
  }
  if (urls.some((_, i) => !denylistUrlFiles.has(i + 1)) && !flags.has("--allow-remote-denylist")) {
    throw new Error("Unmapped configured privacy URLs require an explicit reviewed --denylist-url-file selection or --allow-remote-denylist");
  }
  for (const path of files) {
    if (!isAbsolute(path)) throw new Error("Privacy JSON files require absolute existing paths");
    jsonTerms(localJson(path, "Privacy source")).forEach((t) => terms.add(t));
  }
  // Preflight all selected local counterparts before any permitted remote read.
  const mappedTerms = new Map();
  for (const [index, path] of denylistUrlFiles) {
    const adapted = pin !== null && index === pin.urlSlot;
    let value;
    try { value = localJson(path, "Privacy source", adapted ? pin.sha256 : undefined); }
    catch {
      if (adapted) throw new Error("Reviewed privacy registry unavailable, invalid or snapshot mismatch; renewed review required");
      throw new Error("Privacy source: local JSON unavailable or invalid; supply a reviewed existing file");
    }
    const selected = jsonTerms(value, adapted);
    if (!selected.some((t) => /[\p{L}\p{N}]/u.test(t))) throw new Error("Privacy URL file selection contains no meaningful name or alias terms; refusing to publish");
    mappedTerms.set(index, selected);
  }
  for (const [i, url] of urls.entries()) {
    const selected = mappedTerms.has(i + 1) ? mappedTerms.get(i + 1) : jsonTerms(await fetchJson(url, "Privacy source"));
    selected.forEach((t) => terms.add(t));
  }
  return [...terms].filter(usable);
}
const deny = await loadDenylist();
if (!deny.length) throw new Error("No usable privacy denylist configured; refusing to publish. Supply SHOWCASE_DENYLIST or SHOWCASE_DENYLIST_JSON_FILES");
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const targets = [[join(root, "showcase/projects.json"), projectsJson], [readmePath, readmeNew]];
if (!flags.has("--profile-only")) targets.push([portfolioPath, portfolioJson]);
// Read-only proposed public artifacts join the SAME guard before any staging.
// Bound reads on an open regular-file descriptor; invalid UTF-8 fails closed.
// SVG text labels are scanned in full. Encoded image pixels are not inspected.
function publicText(path) {
  let fd;
  try {
    // Do not allow a read-only selection to alias a destination we will write.
    const real = realpathSync(path);
    if (targets.some(([target]) => (existsSync(target) ? realpathSync(target) : resolve(target)) === real)) throw new Error();
    fd = openSync(path, constants.O_RDONLY | constants.O_NONBLOCK);
    const stat = fstatSync(fd);
    if (!stat.isFile() || stat.size > MAX_PUBLIC_FILE_BYTES) throw new Error();
    const chunks = [];
    let size = 0;
    for (;;) {
      const chunk = Buffer.alloc(Math.min(64 * 1024, MAX_PUBLIC_FILE_BYTES + 1 - size));
      const n = readSync(fd, chunk, 0, chunk.length, null);
      if (!n) break;
      size += n;
      if (size > MAX_PUBLIC_FILE_BYTES) throw new Error();
      chunks.push(chunk.subarray(0, n));
    }
    return new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks));
  } catch { throw new Error("Public artifact unavailable, aliases a write destination, is not a regular file, exceeds size limit or is invalid UTF-8; refusing all writes"); }
  finally { if (fd !== undefined) closeSync(fd); }
}
const publicArtifacts = [...publicFiles].map(publicText);
for (const text of [...targets.map(([, text]) => text), ...publicArtifacts]) {
  if (deny.some((term) => new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRe(term)}($|[^\\p{L}\\p{N}])`, "iu").test(text))) throw new Error("Privacy guard: proposed public text contains a denylisted term; refusing all writes");
}
// Compute and preflight every intended output before writing any. Stage beside
// each destination, then rename. Multi-file renames are not a transaction; a
// filesystem failure during promotion is reported, never treated as success.
const originals = new Map();
const changed = targets.filter(([path, text]) => {
  if (!statSync(dirname(path)).isDirectory()) throw new Error("Intended output directory unavailable");
  const old = existsSync(path) ? readFileSync(path, "utf8") : null;
  if (path === readmePath && old !== readmeOld) throw new Error("README changed during sync; refusing to overwrite concurrent work");
  originals.set(path, old);
  return old !== text;
});
if (CHECK) {
  console.log(`${changed.length} intended output(s) out of date`);
  process.exit(changed.length ? 1 : 0);
}
const staged = [];
try {
  for (const [path, text] of changed) {
    const temp = `${path}.showcase-stage-${process.pid}`;
    const fd = openSync(temp, "wx");
    staged.push([temp, path]);
    try { writeFileSync(fd, text); } finally { closeSync(fd); }
  }
  for (const [path, old] of originals) {
    if ((existsSync(path) ? readFileSync(path, "utf8") : null) !== old) throw new Error("Intended output changed during staging; refusing to overwrite concurrent work");
  }
  for (const [temp, path] of staged) renameSync(temp, path);
} finally {
  for (const [temp] of staged) if (existsSync(temp)) unlinkSync(temp);
}
console.log(`synced ${Object.keys(facts).length} projects; wrote ${changed.length} intended output(s)`);
