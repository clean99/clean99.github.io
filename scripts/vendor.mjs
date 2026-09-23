#!/usr/bin/env node
/**
 * Vendors KaTeX's stylesheet and woff2 faces into public/vendor/katex/, so a post
 * with math costs one same-origin request and never touches a CDN.
 *
 * The shipped CSS lists woff/ttf fallbacks after each woff2 source; those files are
 * not copied, so the fallbacks are stripped. Every browser that can parse the rest of
 * this site supports woff2, and a dangling url() would otherwise 404 on every page load.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const KATEX_DIST = join(ROOT, "node_modules/katex/dist");
const OUT_DIR = join(ROOT, "public/vendor/katex");
const OUT_FONTS = join(OUT_DIR, "fonts");

/**
 * Drop `url(...) format("woff")` / `("truetype")` sources, keeping woff2.
 * Only the trailing formats are removed; the first surviving source keeps the comma list valid.
 */
export function stripLegacyFontSources(css) {
  return css
    .replace(/url\(fonts\/[^)]*\.(?:woff|ttf)\)\s*format\("(?:woff|truetype)"\)\s*,?/g, "")
    .replace(/,\s*;/g, ";");
}

function main() {
  if (!existsSync(KATEX_DIST)) {
    console.error("katex is not installed; run pnpm install first");
    process.exit(1);
  }

  // Rebuild from scratch so a removed face does not linger as a stale file.
  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_FONTS, { recursive: true });

  const faces = readdirSync(join(KATEX_DIST, "fonts")).filter((name) => name.endsWith(".woff2"));
  for (const face of faces) copyFileSync(join(KATEX_DIST, "fonts", face), join(OUT_FONTS, face));

  const css = stripLegacyFontSources(readFileSync(join(KATEX_DIST, "katex.min.css"), "utf8"));
  const referenced = new Set([...css.matchAll(/url\(fonts\/([^)]*)\)/g)].map((match) => match[1]));
  const dangling = [...referenced].filter((name) => !faces.includes(name));
  if (dangling.length) {
    console.error(`vendor: css still references ${dangling.length} missing font(s): ${dangling.join(", ")}`);
    process.exit(1);
  }
  writeFileSync(join(OUT_DIR, "katex.min.css"), css);

  console.log(`vendor: katex.min.css (${referenced.size}/${faces.length} faces referenced) → public/vendor/katex/`);
}

main();
