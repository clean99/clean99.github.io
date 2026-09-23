/**
 * Pure helpers for scripts/build-icons.mjs. Kept free of sharp and the filesystem
 * so the ICO container layout and the manifest shape can be unit-tested directly.
 */
import { createHash } from "node:crypto";

/** Sizes baked into favicon.ico. 16 for the tab, 32 for bookmarks, 48 for the OS. */
export const ICO_SIZES = [16, 32, 48];

/** The seal fills this share of a maskable icon; the rest is the launcher's safe zone. */
export const MASKABLE_SAFE_ZONE = 0.2;

export const APPLE_TOUCH_SIZE = 180;
export const ICON_SIZES = [192, 512];
export const MASKABLE_SIZE = 512;

/**
 * ICO container around PNG payloads.
 *
 * Layout: a 6-byte ICONDIR, a 16-byte ICONDIRENTRY per image, then the image bytes.
 * `bytesInRes`/`imageOffset` are relative to the start of the file. A 256px image is
 * encoded as a 0 dimension byte — 256 is the field's rollover value.
 *
 * @param {{ width: number, height: number, data: Buffer }[]} images
 * @returns {Buffer}
 */
export function buildIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);

  const directory = Buffer.alloc(16 * images.length);
  let offset = header.length + directory.length;

  images.forEach((image, index) => {
    const at = index * 16;
    directory.writeUInt8(image.width >= 256 ? 0 : image.width, at + 0);
    directory.writeUInt8(image.height >= 256 ? 0 : image.height, at + 1);
    directory.writeUInt8(0, at + 2); // palette size
    directory.writeUInt8(0, at + 3); // reserved
    directory.writeUInt16LE(1, at + 4); // colour planes
    directory.writeUInt16LE(32, at + 6); // bits per pixel
    directory.writeUInt32LE(image.data.length, at + 8);
    directory.writeUInt32LE(offset, at + 12);
    offset += image.data.length;
  });

  return Buffer.concat([header, directory, ...images.map((image) => image.data)]);
}

/**
 * Read a single ICO entry back out. The inverse of buildIco, used by tests and by
 * the verification pass rather than by the build itself.
 */
export function readIco(buffer) {
  const count = buffer.readUInt16LE(4);
  const images = [];
  for (let index = 0; index < count; index += 1) {
    const at = 6 + index * 16;
    const width = buffer.readUInt8(at) || 256;
    const height = buffer.readUInt8(at + 1) || 256;
    const size = buffer.readUInt32LE(at + 8);
    const offset = buffer.readUInt32LE(at + 12);
    images.push({ width, height, data: buffer.subarray(offset, offset + size) });
  }
  return images;
}

/**
 * Layout for the maskable icon: the mark is scaled into the inner (1 - safe zone)
 * so a circular or squircle launcher crop never clips it. `pad` is the inset in pixels
 * and `inner` the drawn size.
 */
export function maskableLayout(size, safeZone = MASKABLE_SAFE_ZONE) {
  const inner = Math.round(size * (1 - safeZone));
  return { pad: Math.round((size - inner) / 2), inner };
}

/**
 * Web app manifest. `theme_color`/`background_color` come from THEME_COLOR so the
 * manifest and the `<meta name="theme-color">` tags can never drift apart.
 */
export function buildManifest({ themeColor, name, shortName }) {
  return {
    name,
    short_name: shortName,
    start_url: "/",
    display: "minimal-ui",
    theme_color: themeColor,
    background_color: themeColor,
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ]
  };
}

/** PNG dimensions straight from the IHDR chunk; no image library needed. */
export function pngSize(buffer) {
  if (buffer.length < 24 || buffer.readUInt32BE(0) !== 0x89504e47) return undefined;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

/** Content hash of an icon set, for a one-line "did anything change" summary. */
export function iconSetHash(files) {
  const hash = createHash("sha1");
  for (const [name, buffer] of Object.entries(files)) {
    hash.update(name);
    hash.update(buffer);
  }
  return hash.digest("hex").slice(0, 12);
}
