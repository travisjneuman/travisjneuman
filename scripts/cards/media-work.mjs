// Small, shared file guards for the two card media entry points. No rendering here.
import { lstatSync, readFileSync, realpathSync, writeFileSync, mkdirSync } from "node:fs";
import { hostname } from "node:os";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";

function statOrMissing(file) {
  try { return lstatSync(file); }
  catch (error) { if (error.code === "ENOENT") return null; throw error; }
}

export function mediaWork() {
  if (process.platform !== "win32" || hostname().toUpperCase() !== "TJN-DESK") {
    throw new Error("Card media runs only on TJN-DESK through desk-run.ps1.");
  }
  const work = process.env.TJN_MEDIA_WORK;
  if (!work || !isAbsolute(work)) throw new Error("desk-run.ps1 must set TJN_MEDIA_WORK.");
  const job = resolve(work);
  if (work.toLowerCase() !== job.toLowerCase()) {
    throw new Error("TJN_MEDIA_WORK must use its canonical lexical spelling without removed path components.");
  }
  if (!/^D:\\LazyGolfing-Work\\Jobs\\[a-z0-9]+(?:-[a-z0-9]+)*-\d{4}-\d{2}-\d{2}$/i.test(job)) {
    throw new Error("TJN_MEDIA_WORK must be a dated job under D:\\LazyGolfing-Work\\Jobs.");
  }
  for (let dir = job; ; dir = dirname(dir)) {
    const stat = lstatSync(dir);
    if (!stat.isDirectory() || stat.isSymbolicLink() || statOrMissing(resolve(dir, ".git"))) {
      throw new Error("Media job ancestors must be real directories outside a git checkout.");
    }
    if (dirname(dir) === dir) break;
  }
  if (realpathSync(job).toLowerCase() !== job.toLowerCase()) {
    throw new Error("Media job cannot resolve through a junction or alias.");
  }
  return job;
}

export function cardId(id) {
  if (typeof id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
    throw new Error("Card IDs must be lowercase letters, digits and hyphens.");
  }
  return id;
}

export function xmlText(value, label) {
  if (typeof value !== "string" || !value.length ||
      /[^\u0009\u000A\u000D\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/u.test(value)) {
    throw new Error(`Invalid XML text: ${label}`);
  }
  return value;
}

function jobPath(job, name) {
  const file = resolve(job, name);
  const rel = relative(job, file);
  if (!rel || rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    throw new Error("All media files must be strictly inside TJN_MEDIA_WORK.");
  }
  let current = job;
  const parts = rel.split(sep);
  for (let i = 0; i < parts.length; i++) {
    current = resolve(current, parts[i]);
    const stat = statOrMissing(current);
    if (stat && (stat.isSymbolicLink() || (i < parts.length - 1 && !stat.isDirectory()) ||
        (stat.isDirectory() && statOrMissing(resolve(current, ".git"))))) {
      throw new Error("Media paths cannot contain symlinks, junctions, git checkouts or non-directory parents.");
    }
    if (stat && realpathSync(current).toLowerCase() !== current.toLowerCase()) {
      throw new Error("Media paths cannot resolve outside their literal job paths.");
    }
  }
  return file;
}

export function readWorkFile(job, name, optional = false) {
  const file = jobPath(job, name);
  const stat = statOrMissing(file);
  if (!stat && optional) return null;
  if (!stat?.isFile() || !stat.size) throw new Error(`Missing or empty staged input: ${file}`);
  return readFileSync(file);
}

export function outputPlan(job, names) {
  const seen = new Set();
  return names.map((name) => {
    const file = jobPath(job, name);
    const key = file.toLowerCase();
    if (seen.has(key)) throw new Error("Duplicate media output path.");
    seen.add(key);
    if (statOrMissing(file)) throw new Error(`Refusing to overwrite job artifact: ${file}`);
    return file;
  });
}

export function writeOutputs(job, files, buffers) {
  if (files.length !== buffers.length || buffers.some((buf) => !Buffer.isBuffer(buf) || !buf.length)) {
    throw new Error("All media buffers must be prepared before any write.");
  }
  // Re-preflight after encoding; exclusive creation also protects a file that arrives later.
  outputPlan(job, files);
  for (let i = 0; i < files.length; i++) {
    mkdirSync(dirname(files[i]), { recursive: true });
    writeFileSync(files[i], buffers[i], { flag: "wx" });
    console.log(`${relative(job, files[i])} ${buffers[i].length} bytes`);
  }
}
