/**
 * Pure helpers for scripts/build-images.mjs. No filesystem or sharp access here so
 * every rule (which widths, what file names, how the manifest is shaped) is unit-testable.
 */
import { createHash } from "node:crypto";

/** Widths generated for every raster source, ascending. */
export const VARIANT_WIDTHS = [360, 720, 1080, 1440];

/**
 * Widest WebP a `<img src>` ever points at: 2x the 45rem prose column.
 * Mirrors CONTENT_SIZES in src/lib/images.ts; keep the two in step.
 */
export const FALLBACK_MAX_WIDTH = 1440;

/** Formats that get resized variants. `gif` is excluded so animation survives. */
export const RASTER_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

/** Bump when a change here invalidates previously cached variants. */
export const OPTIONS_VERSION = "v1";

/** Where the reader lives; mirrors MANIFEST_PATH in src/lib/images.ts. */
export const MANIFEST_PATH = "src/data/image-manifest.json";

export const AVIF_QUALITY = 50;
export const AVIF_EFFORT = 4;
export const WEBP_QUALITY = 75;

/** Lowercase extension including the dot: `a/B.PNG` → `.png`. */
export function extensionOf(file) {
  const base = file.slice(file.lastIndexOf("/") + 1);
  const dot = base.lastIndexOf(".");
  return dot <= 0 ? "" : base.slice(dot).toLowerCase();
}

/** The path without its extension: `dir/a.png` → `dir/a`. */
export function stemOf(file) {
  const ext = extensionOf(file);
  return ext ? file.slice(0, -ext.length) : file;
}

export function isRaster(file) {
  return RASTER_EXTENSIONS.has(extensionOf(file));
}

/** `<dir>/<name>-<width>.<ext>` — the variant sits next to its original. */
export function variantName(relPath, width, ext) {
  return `${stemOf(relPath)}-${width}.${ext}`;
}

/**
 * Widths to render for a source of `originalWidth` pixels, ascending.
 * Never upscales; a source narrower than the largest step contributes its own width,
 * so the widest variant always carries the original's full resolution.
 */
export function variantWidths(originalWidth, steps = VARIANT_WIDTHS) {
  if (!Number.isFinite(originalWidth) || originalWidth <= 0) return [];
  const widths = new Set(steps.filter((w) => w < originalWidth));
  widths.add(originalWidth);
  return [...widths].sort((a, b) => a - b);
}

/** The widest variant no wider than the content column at 2x — the `<img src>` fallback. */
export function fallbackWidth(widths, max = FALLBACK_MAX_WIDTH) {
  const usable = widths.filter((w) => w <= max);
  return usable.at(-1) ?? widths[0];
}

/**
 * Percent-encode each path segment. `encodeURI` leaves `(`/`)`/`'` alone, which is
 * legal in an attribute but annoying in a srcset; a raw space would end the URL early.
 */
export function encodePublicPath(publicPath) {
  return publicPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

/** `[{src, width}]` → `"/img/a-360.webp 360w, /img/a-720.webp 720w"`. */
export function srcset(entries) {
  return entries.map((entry) => `${encodePublicPath(entry.src)} ${entry.width}w`).join(", ");
}

/**
 * Manifest key: the path an author wrote in markdown, percent-decoded, query/hash stripped.
 * Must stay identical to manifestKey() in src/lib/images.ts — it is the lookup key.
 */
export function manifestKey(src) {
  const raw = src.split(/[?#]/, 1)[0] ?? src;
  try {
    return decodeURI(raw);
  } catch {
    return raw;
  }
}

/** `/img/dir/file.png` for a `dir/file.png` path inside content/img. */
export function publicPath(relPath) {
  return `/img/${relPath}`;
}

/** sha1 over the source bytes plus every option that affects the encoded output. */
export function cacheKey(bytes, optionsVersion = OPTIONS_VERSION) {
  const hash = createHash("sha1");
  hash.update(bytes);
  hash.update(`\u0000${optionsVersion}`);
  hash.update(`\u0000${VARIANT_WIDTHS.join(",")}`);
  hash.update(`\u0000avif:${AVIF_QUALITY}:${AVIF_EFFORT}`);
  hash.update(`\u0000webp:${WEBP_QUALITY}`);
  return hash.digest("hex");
}

/**
 * Decide every file this run will write, before anything touches the disk.
 *
 * Planned up front so a source whose name already ends like a variant
 * (`a-360.webp` next to `a.webp`) cannot silently overwrite the original.
 * `relativeName` paths use forward slashes.
 *
 * @param {{ relPath: string, width: number, raster: boolean }[]} sources
 */
export function planOutputs(sources) {
  const sourcePaths = new Set(sources.map((s) => s.relPath));
  const variants = [];
  const collisions = [];
  const seen = new Set();

  for (const source of sources) {
    if (!source.raster) continue;
    for (const width of variantWidths(source.width)) {
      for (const format of /** @type {const} */ (["avif", "webp"])) {
        const relPath = variantName(source.relPath, width, format);
        if (sourcePaths.has(relPath)) {
          collisions.push(relPath);
          continue;
        }
        if (seen.has(relPath)) continue;
        seen.add(relPath);
        variants.push({ source: source.relPath, relPath, width, format });
      }
    }
  }

  return {
    /** Files copied byte-for-byte; excludes any name a variant claims. */
    copies: sources.map((s) => s.relPath).filter((relPath) => !seen.has(relPath)),
    variants,
    collisions: [...new Set(collisions)].sort()
  };
}

/** Manifest entry for one raster source, given its encoded variant file names. */
export function rasterEntry({ width, height, relPath, widths, formats }) {
  const best = fallbackWidth(widths);
  return {
    width,
    height,
    src: encodePublicPath(publicPath(variantName(relPath, best, "webp"))),
    sources: formats.map((format) => ({
      type: format === "avif" ? "image/avif" : "image/webp",
      srcset: srcset(widths.map((w) => ({ src: publicPath(variantName(relPath, w, format)), width: w })))
    }))
  };
}

/** gif (animation) and svg (resolution-free): the original is the only file. */
export function passthroughEntry({ width, height, relPath }) {
  return { width, height, src: encodePublicPath(publicPath(relPath)), sources: [] };
}
