/**
 * Contract between `scripts/build-images.mjs` (writer) and the markdown/image
 * components (readers). Keyed by the public path authors write: `/img/<dir>/<file>`.
 */
export interface ImageSource {
  type: "image/avif" | "image/webp";
  srcset: string;
}

export interface ImageEntry {
  width: number;
  height: number;
  /** Fallback `<img src>`: a WebP no wider than the content column at 2x. */
  src: string;
  sources: ImageSource[];
}

export type ImageManifest = Record<string, ImageEntry>;

export const MANIFEST_PATH = "src/data/image-manifest.json";

/** Rendered width of a full-bleed prose image at each breakpoint. */
export const CONTENT_SIZES = "(min-width: 50rem) 45rem, calc(100vw - 2.5rem)";

export function isLocalImage(src: string): boolean {
  return src.startsWith("/img/");
}

export function manifestKey(src: string): string {
  const path = src.split(/[?#]/, 1)[0] ?? src;
  try {
    return decodeURI(path);
  } catch {
    return path;
  }
}

/** Width/height attributes for an image an author pinned to a display width. */
export function scaledDimensions(
  entry: Pick<ImageEntry, "width" | "height">,
  displayWidth?: number
): { width: number; height: number } {
  if (!displayWidth || displayWidth <= 0 || displayWidth >= entry.width)
    return { width: entry.width, height: entry.height };
  return { width: displayWidth, height: Math.round((entry.height * displayWidth) / entry.width) };
}
