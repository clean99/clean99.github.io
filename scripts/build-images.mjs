#!/usr/bin/env node
/**
 * Content images → public/img + src/data/image-manifest.json.
 *
 * Every original is copied byte-for-byte so legacy `/img/...` URLs keep resolving,
 * then each raster gets AVIF/WebP width variants beside it. Encoded variants are
 * cached by source hash under .cache/images, so a rerun (and CI's restored cache)
 * only pays encoding time for images that actually changed.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { cpus } from "node:os";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
  AVIF_EFFORT,
  AVIF_QUALITY,
  MANIFEST_PATH,
  WEBP_QUALITY,
  cacheKey,
  isRaster,
  passthroughEntry,
  planOutputs,
  publicPath,
  rasterEntry
} from "./lib/images-variants.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_DIR = join(ROOT, "content/img");
const OUTPUT_DIR = join(ROOT, "public/img");
const CACHE_DIR = join(ROOT, ".cache/images");
const MANIFEST_FILE = join(ROOT, MANIFEST_PATH);

/** AVIF is the slow half; two in flight keeps every core busy without thrashing. */
const CONCURRENCY = Math.max(2, Math.min(4, cpus().length - 1));

/** Every relative path this run expects under public/img; anything else there is stale. */
const expected = new Set();

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

/** `content/img/a/b.png` → `a/b.png`, always with forward slashes. */
function relativeName(file) {
  return relative(SOURCE_DIR, file).split(sep).join("/");
}

function writeOutput(relPath, bytes) {
  const target = join(OUTPUT_DIR, relPath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, bytes);
  expected.add(relPath);
}

function cacheDirFor(hash) {
  const dir = join(CACHE_DIR, hash);
  mkdirSync(dir, { recursive: true });
  return dir;
}

async function encode(source, width, format) {
  const pipeline = sharp(source, { animated: false }).resize({ width, withoutEnlargement: true });
  return format === "avif"
    ? pipeline.avif({ quality: AVIF_QUALITY, effort: AVIF_EFFORT }).toBuffer()
    : pipeline.webp({ quality: WEBP_QUALITY }).toBuffer();
}

/** Run `worker` over `items` with at most `limit` in flight. */
async function mapLimit(items, limit, worker) {
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      await worker(items[index]);
    }
  });
  await Promise.all(runners);
}

/** Delete outputs under public/img that no current source produces; prune empty dirs. */
function prune() {
  let removed = 0;
  const visit = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      const rel = relative(OUTPUT_DIR, full).split(sep).join("/");
      if (entry.isDirectory()) {
        visit(full);
        if (!readdirSync(full).length) rmSync(full, { recursive: true, force: true });
      } else if (!expected.has(rel)) {
        rmSync(full, { force: true });
        removed += 1;
      }
    }
  };
  if (existsSync(OUTPUT_DIR)) visit(OUTPUT_DIR);
  return removed;
}

/** Atomic: a half-written manifest would silently drop every image from the build. */
function writeManifest(manifest) {
  const sorted = Object.fromEntries(
    Object.keys(manifest)
      .sort()
      .map((key) => [key, manifest[key]])
  );
  const tmp = `${MANIFEST_FILE}.tmp`;
  mkdirSync(dirname(MANIFEST_FILE), { recursive: true });
  writeFileSync(tmp, `${JSON.stringify(sorted, null, 2)}\n`);
  renameSync(tmp, MANIFEST_FILE);
  return Object.keys(sorted).length;
}

async function main() {
  if (!existsSync(SOURCE_DIR)) {
    console.error(`no source directory: ${relative(ROOT, SOURCE_DIR)}`);
    process.exit(1);
  }

  const files = walk(SOURCE_DIR);
  const bytesByPath = new Map();
  const sizes = new Map();
  const skipped = [];

  for (const file of files) {
    const relPath = relativeName(file);
    bytesByPath.set(relPath, readFileSync(file));
    try {
      const metadata = await sharp(file, { animated: false }).metadata();
      if (!metadata.width || !metadata.height) throw new Error("no intrinsic size");
      sizes.set(relPath, { width: metadata.width, height: metadata.height });
    } catch (error) {
      skipped.push(`${relPath} (${error instanceof Error ? error.message : String(error)})`);
    }
  }

  const readable = [...sizes.keys()].sort();
  const plan = planOutputs(
    readable.map((relPath) => ({ relPath, width: sizes.get(relPath).width, raster: isRaster(relPath) }))
  );
  for (const relPath of plan.collisions) skipped.push(`${relPath} (name collides with a generated variant)`);

  for (const relPath of plan.copies) writeOutput(relPath, bytesByPath.get(relPath));

  let encoded = 0;
  let reused = 0;
  await mapLimit(plan.variants, CONCURRENCY, async ({ source, relPath, width, format }) => {
    const cached = join(cacheDirFor(cacheKey(bytesByPath.get(source))), relPath);
    if (existsSync(cached)) {
      writeOutput(relPath, readFileSync(cached));
      reused += 1;
      return;
    }
    const buffer = await encode(join(SOURCE_DIR, source), width, format);
    mkdirSync(dirname(cached), { recursive: true });
    writeFileSync(cached, buffer);
    writeOutput(relPath, buffer);
    encoded += 1;
  });

  for (const source of plan.collisions) expected.delete(source);

  const manifest = {};
  for (const relPath of readable) {
    const { width, height } = sizes.get(relPath);
    manifest[publicPath(relPath)] = isRaster(relPath)
      ? rasterEntry({
          width,
          height,
          relPath,
          widths: plan.variants.filter((v) => v.source === relPath && v.format === "webp").map((v) => v.width),
          formats: ["avif", "webp"]
        })
      : passthroughEntry({ width, height, relPath });
  }

  const removed = prune();
  const entries = writeManifest(manifest);
  const cachedDirs = existsSync(CACHE_DIR) ? readdirSync(CACHE_DIR).length : 0;

  console.log(
    `images: ${entries} entries from ${files.length} sources · ${encoded} variants encoded, ${reused} from cache · ` +
      `${removed} stale removed · ${cachedDirs} cached sources` +
      (skipped.length ? ` · ${skipped.length} skipped` : "")
  );
  for (const note of skipped) console.warn(`  skipped ${note}`);
}

await main();
