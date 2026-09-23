import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  APPLE_TOUCH_SIZE,
  ICO_SIZES,
  ICON_SIZES,
  MASKABLE_SIZE,
  MASKABLE_SAFE_ZONE,
  buildIco,
  buildManifest,
  iconSetHash,
  maskableLayout,
  pngSize,
  readIco
} from "../scripts/lib/icons-ico.mjs";
import {
  AVIF_QUALITY,
  FALLBACK_MAX_WIDTH,
  MANIFEST_PATH,
  OPTIONS_VERSION,
  RASTER_EXTENSIONS,
  VARIANT_WIDTHS,
  WEBP_QUALITY,
  cacheKey,
  encodePublicPath,
  extensionOf,
  fallbackWidth,
  isRaster,
  manifestKey,
  passthroughEntry,
  planOutputs,
  publicPath,
  rasterEntry,
  srcset,
  stemOf,
  variantName,
  variantWidths
} from "../scripts/lib/images-variants.mjs";

/** A minimal PNG: signature + IHDR width/height, which is all pngSize reads. */
function fakePng(width, height) {
  const buffer = Buffer.alloc(24);
  buffer.writeUInt32BE(0x89504e47, 0);
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
}

// ---------------------------------------------------------------------------
// Image variant planning
// ---------------------------------------------------------------------------

test("extensionOf lowercases and keeps the dot; a dotfile has none", () => {
  assert.equal(extensionOf("a/B.PNG"), ".png");
  assert.equal(extensionOf("a/b.jpeg"), ".jpeg");
  assert.equal(extensionOf("noext"), "");
  assert.equal(extensionOf(".gitignore"), "");
  assert.equal(extensionOf("dir.d/file"), "");
});

test("stemOf drops only the extension", () => {
  assert.equal(stemOf("dir/a.png"), "dir/a");
  assert.equal(stemOf("dir.d/a"), "dir.d/a");
  assert.equal(stemOf("a"), "a");
});

test("isRaster covers the resizeable formats and excludes gif and svg", () => {
  for (const ext of RASTER_EXTENSIONS) assert.equal(isRaster(`x${ext}`), true);
  assert.equal(isRaster("x.gif"), false);
  assert.equal(isRaster("x.svg"), false);
  assert.equal(isRaster("x.avif"), false);
});

test("variantName sits the variant beside its original", () => {
  assert.equal(variantName("dir/a.png", 720, "webp"), "dir/a-720.webp");
});

test("variantWidths never upscales and always keeps the original width", () => {
  assert.deepEqual(variantWidths(2000), [360, 720, 1080, 1440, 2000]);
  assert.deepEqual(variantWidths(800), [360, 720, 800]);
  assert.deepEqual(variantWidths(400), [360, 400]);
  assert.deepEqual(variantWidths(200), [200]);
});

test("variantWidths returns nothing for a non-positive or non-finite width", () => {
  assert.deepEqual(variantWidths(0), []);
  assert.deepEqual(variantWidths(-1), []);
  assert.deepEqual(variantWidths(Number.NaN), []);
  assert.deepEqual(variantWidths(Number.POSITIVE_INFINITY), []);
});

test("variantWidths is ascending and de-duplicated", () => {
  const widths = variantWidths(1080);
  assert.deepEqual(widths, [...widths].sort((a, b) => a - b));
  assert.equal(new Set(widths).size, widths.length);
});

test("fallbackWidth picks the widest variant the column can actually use", () => {
  assert.equal(fallbackWidth([360, 720, 1080, 1440, 2000]), FALLBACK_MAX_WIDTH);
  assert.equal(fallbackWidth([360, 720]), 720);
  // A source wider than the cap still has to give src something.
  assert.equal(fallbackWidth([2000], 1440), 2000);
});

test("encodePublicPath escapes every segment but leaves slashes alone", () => {
  assert.equal(encodePublicPath("/img/a b/c(d).png"), "/img/a%20b/c(d).png");
  assert.equal(encodePublicPath("/img/plain.png"), "/img/plain.png");
});

test("srcset renders width descriptors with encoded paths", () => {
  const rendered = srcset([
    { src: "/img/a-360.webp", width: 360 },
    { src: "/img/a b-720.webp", width: 720 }
  ]);
  assert.equal(rendered, "/img/a-360.webp 360w, /img/a%20b-720.webp 720w");
  assert.equal(srcset([]), "");
});

test("manifestKey strips query and hash and percent-decodes", () => {
  assert.equal(manifestKey("/img/a.png?v=2"), "/img/a.png");
  assert.equal(manifestKey("/img/a.png#frag"), "/img/a.png");
  assert.equal(manifestKey("/img/a%20b.png"), "/img/a b.png");
  assert.equal(manifestKey("/img/a.png"), "/img/a.png");
});

test("manifestKey leaves malformed percent-encoding as written", () => {
  assert.equal(manifestKey("/img/100%.png"), "/img/100%.png");
});

test("publicPath prefixes the site's image route", () => {
  assert.equal(publicPath("dir/a.png"), "/img/dir/a.png");
});

test("cacheKey is stable, and moves with the bytes or any encode option", () => {
  const base = cacheKey(Buffer.from("abc"));
  assert.equal(base, cacheKey(Buffer.from("abc")));
  assert.notEqual(base, cacheKey(Buffer.from("abd")));
  assert.notEqual(base, cacheKey(Buffer.from("abc"), "v2"));
  assert.equal(base.length, 40);
});

test("cacheKey folds the option version, widths and qualities into the hash", () => {
  const digest = createHash("sha1");
  digest.update(Buffer.from("abc"));
  digest.update(`\u0000${OPTIONS_VERSION}`);
  digest.update(`\u0000${VARIANT_WIDTHS.join(",")}`);
  digest.update(`\u0000avif:${AVIF_QUALITY}:4`);
  digest.update(`\u0000webp:${WEBP_QUALITY}`);
  assert.equal(cacheKey(Buffer.from("abc")), digest.digest("hex"));
});

test("planOutputs copies every source and adds avif+webp for each raster width", () => {
  const plan = planOutputs([
    { relPath: "a.png", width: 800, raster: true },
    { relPath: "anim.gif", width: 400, raster: false }
  ]);
  assert.deepEqual(plan.collisions, []);
  assert.deepEqual(plan.copies, ["a.png", "anim.gif"]);
  const generated = plan.variants.map((v) => v.relPath).sort();
  assert.deepEqual(generated, [
    "a-360.avif",
    "a-360.webp",
    "a-720.avif",
    "a-720.webp",
    "a-800.avif",
    "a-800.webp"
  ]);
  assert.ok(plan.variants.every((v) => v.source === "a.png"));
});

test("planOutputs refuses to let a variant overwrite a real source", () => {
  const plan = planOutputs([
    { relPath: "a.png", width: 800, raster: true },
    { relPath: "a-360.webp", width: 100, raster: true }
  ]);
  assert.ok(plan.collisions.includes("a-360.webp"));
  // The real file stays a copy; the generated name that would have clobbered it is gone.
  assert.ok(plan.copies.includes("a-360.webp"));
  assert.ok(!plan.variants.some((v) => v.relPath === "a-360.webp"));
});

test("planOutputs never emits the same path twice", () => {
  const plan = planOutputs([
    { relPath: "a.png", width: 400, raster: true },
    { relPath: "b.png", width: 400, raster: true }
  ]);
  const paths = plan.variants.map((v) => v.relPath);
  assert.equal(new Set(paths).size, paths.length);
});

test("planOutputs generates nothing for a non-raster source", () => {
  const plan = planOutputs([{ relPath: "a.svg", width: 64, raster: false }]);
  assert.deepEqual(plan.variants, []);
  assert.deepEqual(plan.copies, ["a.svg"]);
});

test("rasterEntry points src at the widest usable webp and lists both formats", () => {
  const entry = rasterEntry({
    width: 2000,
    height: 1000,
    relPath: "dir/a.png",
    widths: [360, 720, 1080, 1440, 2000],
    formats: ["avif", "webp"]
  });
  assert.equal(entry.src, "/img/dir/a-1440.webp");
  assert.equal(entry.width, 2000);
  assert.equal(entry.height, 1000);
  assert.deepEqual(
    entry.sources.map((s) => s.type),
    ["image/avif", "image/webp"]
  );
  assert.ok(entry.sources[0].srcset.includes("/img/dir/a-360.avif 360w"));
  assert.ok(entry.sources[1].srcset.includes("/img/dir/a-2000.webp 2000w"));
});

test("passthroughEntry keeps the original as the only file", () => {
  const entry = passthroughEntry({ width: 320, height: 240, relPath: "anim.gif" });
  assert.deepEqual(entry, { width: 320, height: 240, src: "/img/anim.gif", sources: [] });
});

test("the manifest path matches what the reader module expects", () => {
  assert.equal(MANIFEST_PATH, "src/data/image-manifest.json");
});

// ---------------------------------------------------------------------------
// ICO packing
// ---------------------------------------------------------------------------

test("buildIco writes an ICONDIR with one 16-byte entry per image", () => {
  const images = ICO_SIZES.map((size) => ({ width: size, height: size, data: fakePng(size, size) }));
  const ico = buildIco(images);
  assert.equal(ico.readUInt16LE(0), 0);
  assert.equal(ico.readUInt16LE(2), 1);
  assert.equal(ico.readUInt16LE(4), images.length);
  assert.equal(ico.length, 6 + 16 * images.length + images.reduce((n, i) => n + i.data.length, 0));
});

test("buildIco round-trips through readIco", () => {
  const images = ICO_SIZES.map((size) => ({ width: size, height: size, data: fakePng(size, size) }));
  const back = readIco(buildIco(images));
  assert.deepEqual(
    back.map((i) => [i.width, i.height]),
    ICO_SIZES.map((size) => [size, size])
  );
  assert.ok(back.every((image, index) => image.data.equals(images[index].data)));
});

test("buildIco records each image's byte length and file offset", () => {
  const images = [
    { width: 16, height: 16, data: Buffer.alloc(10, 1) },
    { width: 32, height: 32, data: Buffer.alloc(20, 2) }
  ];
  const ico = buildIco(images);
  assert.equal(ico.readUInt32LE(6 + 8), 10);
  assert.equal(ico.readUInt32LE(6 + 12), 6 + 32);
  assert.equal(ico.readUInt32LE(6 + 16 + 8), 20);
  assert.equal(ico.readUInt32LE(6 + 16 + 12), 6 + 32 + 10);
});

test("buildIco encodes a 256px image as the 0 rollover byte", () => {
  const ico = buildIco([{ width: 256, height: 256, data: fakePng(256, 256) }]);
  assert.equal(ico.readUInt8(6), 0);
  assert.equal(ico.readUInt8(7), 0);
  // ...and readIco restores the real dimension rather than reporting a zero.
  assert.equal(readIco(ico)[0].width, 256);
});

test("readIco tolerates a container with no images", () => {
  assert.deepEqual(readIco(buildIco([])), []);
});

test("the ico carries the sizes a browser asks for", () => {
  assert.deepEqual(ICO_SIZES, [16, 32, 48]);
});

test("maskableLayout insets the mark inside the launcher safe zone", () => {
  const layout = maskableLayout(MASKABLE_SIZE);
  assert.equal(layout.inner, Math.round(MASKABLE_SIZE * (1 - MASKABLE_SAFE_ZONE)));
  assert.equal(layout.pad, Math.round((MASKABLE_SIZE - layout.inner) / 2));
  assert.equal(layout.inner + layout.pad * 2, MASKABLE_SIZE);
});

test("maskableLayout honours a custom safe zone", () => {
  const layout = maskableLayout(100, 0.5);
  assert.equal(layout.inner, 50);
  assert.equal(layout.pad, 25);
});

test("buildManifest lists the icon set the build actually writes", () => {
  const manifest = buildManifest({ themeColor: "#f4f1ea", name: "Koh Hom", shortName: "KH" });
  assert.equal(manifest.name, "Koh Hom");
  assert.equal(manifest.short_name, "KH");
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.theme_color, "#f4f1ea");
  assert.equal(manifest.background_color, "#f4f1ea");
  assert.deepEqual(
    manifest.icons.map((icon) => icon.src),
    ICON_SIZES.map((size) => `/icon-${size}.png`).concat(`/icon-maskable-${MASKABLE_SIZE}.png`)
  );
  assert.equal(manifest.icons.at(-1).purpose, "maskable");
});

test("pngSize reads the IHDR chunk and rejects a non-PNG", () => {
  assert.deepEqual(pngSize(fakePng(180, 180)), { width: 180, height: 180 });
  assert.deepEqual(pngSize(fakePng(APPLE_TOUCH_SIZE, APPLE_TOUCH_SIZE)), {
    width: APPLE_TOUCH_SIZE,
    height: APPLE_TOUCH_SIZE
  });
  assert.equal(pngSize(Buffer.from("not a png at all, but long enough")), undefined);
  assert.equal(pngSize(Buffer.alloc(4)), undefined);
});

test("iconSetHash is stable for one set, and changes with order or any byte", () => {
  const files = { "a.png": Buffer.from("a"), "b.ico": Buffer.from("b") };
  const same = Object.fromEntries([...Object.entries(files)].reverse());
  assert.equal(iconSetHash(files), iconSetHash(files));
  assert.equal(iconSetHash(files).length, 12);
  // The name is folded in ahead of the bytes, so a reordered set is a different set.
  assert.notEqual(iconSetHash(files), iconSetHash(same));
  assert.notEqual(iconSetHash(files), iconSetHash({ ...files, "a.png": Buffer.from("z") }));
});
