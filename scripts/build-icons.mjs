#!/usr/bin/env node
/**
 * One-off icon generation: `pnpm icons`.
 *
 * Outputs land in public/ and are committed, because GitHub Pages serves them
 * straight and they must exist even when the image cache is cold.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
  APPLE_TOUCH_SIZE,
  ICON_SIZES,
  ICO_SIZES,
  MASKABLE_SIZE,
  buildIco,
  buildManifest,
  iconSetHash,
  maskableLayout,
  pngSize
} from "./lib/icons-ico.mjs";
import { SITE } from "../src/site.config.ts";
import { THEME_COLOR } from "../src/lib/theme.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_DIR = join(ROOT, "public");
const SOURCE = join(PUBLIC_DIR, "favicon.svg");

/**
 * SVG is resolution-independent, so rasterise once at a high density and let sharp
 * downsample: resizing the vector per size re-introduces aliasing at 16px.
 */
const RASTER_DENSITY = 1024;

/**
 * Rasterise the seal at `size`. Every icon is flattened onto the light paper token:
 * a launcher composites icons over an unknown backdrop, and a transparent favicon
 * looks like a hole on a dark tab strip.
 */
async function render(size, { pad = 0 } = {}) {
  const inner = size - pad * 2;
  const mark = await sharp(readFileSync(SOURCE), { density: RASTER_DENSITY }).resize(inner, inner).png().toBuffer();
  const base = pad
    ? sharp({ create: { width: size, height: size, channels: 4, background: THEME_COLOR.light } }).composite([
        { input: mark, top: pad, left: pad }
      ])
    : sharp(mark);
  // A palette PNG is within 2/255 of the full-colour one and a third smaller; browsers fetch
  // the icons during page load, so the bytes compete with the fonts for first paint.
  return base
    .flatten({ background: THEME_COLOR.light })
    .png({ compressionLevel: 9, palette: true, effort: 10 })
    .toBuffer();
}

async function main() {
  mkdirSync(PUBLIC_DIR, { recursive: true });

  const files = {};

  // favicon.ico: worked out of the same seal, no extra dependency for the container.
  const icoImages = [];
  for (const size of ICO_SIZES) {
    icoImages.push({ width: size, height: size, data: await render(size) });
  }
  files["favicon.ico"] = buildIco(icoImages);

  // apple-touch-icon: opaque paper, with breathing room for the rounded launcher mask.
  const applePad = Math.round(APPLE_TOUCH_SIZE * 0.1);
  files["apple-touch-icon.png"] = await render(APPLE_TOUCH_SIZE, { pad: applePad });

  for (const size of ICON_SIZES) files[`icon-${size}.png`] = await render(size);

  // Maskable: opaque and inset into the safe zone, so any launcher crop keeps the mark whole.
  const layout = maskableLayout(MASKABLE_SIZE);
  files["icon-maskable-512.png"] = await render(MASKABLE_SIZE, { pad: layout.pad });

  files["manifest.webmanifest"] = Buffer.from(
    `${JSON.stringify(
      buildManifest({ themeColor: THEME_COLOR.light, name: SITE.title, shortName: SITE.shortTitle }),
      null,
      2
    )}\n`
  );

  for (const [name, buffer] of Object.entries(files)) {
    writeFileSync(join(PUBLIC_DIR, name), buffer);
  }

  const sizes = Object.entries(files)
    .map(([name, buffer]) => {
      const dims = name.endsWith(".png") ? pngSize(buffer) : undefined;
      return dims ? `${name} ${dims.width}x${dims.height}` : `${name} ${buffer.length}b`;
    })
    .join(" · ");
  console.log(`icons: ${iconSetHash(files)} · ${sizes}`);
}

await main();
