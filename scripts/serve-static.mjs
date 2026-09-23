#!/usr/bin/env node
/**
 * Minimal static server that imitates GitHub Pages for local E2E runs.
 *
 *   node scripts/serve-static.mjs [--dist <dir>] [--port 4334]
 *
 * GitHub Pages behaviour that the E2E suite depends on:
 *   - case-sensitive paths
 *   - `/foo/` and `/foo` both serve `foo/index.html`
 *   - an unknown path serves the build's `404.html` with status 404
 *   - directory listings are never generated
 *   - text responses are gzipped, so Lighthouse measures the bytes a visitor downloads
 *
 * Only `node:http` is used, so E2E runs need no extra dependency.
 */
import { createReadStream, existsSync, readdirSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { createGzip } from "node:zlib";
import { extname, join, normalize, relative as relativePath, resolve, sep } from "node:path";

const TYPES = {
  ".avif": "image/avif",
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".wasm": "application/wasm",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".xml": "application/xml; charset=utf-8"
};

function readOption(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  const inline = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (inline) return inline.slice(name.length + 3);
  return fallback;
}

const distArg = readOption("dist", process.env.E2E_DIST || "dist");
const port = Number(readOption("port", process.env.E2E_PORT || "4334"));
const root = resolve(distArg);

if (!existsSync(root)) {
  console.error(`serve-static: build directory not found: ${root}`);
  console.error("Run a production build first (astro build) or set E2E_DIST.");
  process.exit(1);
}

function contentType(file) {
  return TYPES[extname(file).toLowerCase()] ?? "application/octet-stream";
}

const COMPRESSIBLE = /^(text\/|image\/svg|application\/(json|xml|manifest|wasm))/;

/** Stream `file` with the given headers, gzipped when the type and the client allow it. */
function send(request, response, status, file, type) {
  const headers = { "content-type": type, "cache-control": "no-cache" };
  const compressible = COMPRESSIBLE.test(type);
  const gzip = compressible && /\bgzip\b/.test(request.headers["accept-encoding"] ?? "");
  if (compressible) headers.vary = "accept-encoding";
  if (gzip) headers["content-encoding"] = "gzip";
  response.writeHead(status, headers);
  const body = createReadStream(file);
  (gzip ? body.pipe(createGzip()) : body).pipe(response);
}

const listings = new Map();

/**
 * macOS and Windows disks match paths case-insensitively, so `existsSync` alone
 * would serve `/About/` from `about/`. Compare every segment against the real
 * directory entries, as GitHub Pages' case-sensitive host does.
 */
function existsExactly(file) {
  let dir = root;
  for (const segment of relativePath(root, file).split(sep)) {
    let entries = listings.get(dir);
    if (!entries) {
      entries = new Set(readdirSync(dir));
      listings.set(dir, entries);
    }
    if (!entries.has(segment)) return false;
    dir = join(dir, segment);
  }
  return true;
}

/** Resolve a URL path to a file inside `root`, refusing traversal. */
function resolveFile(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return undefined;
  }
  const relative = normalize(decoded).replace(/^([/\\])+/, "");
  const base = relative.endsWith("/") ? `${relative}index.html` : relative;
  const candidates = [join(root, base), join(root, base, "index.html"), join(root, `${base}.html`)];
  for (const candidate of candidates) {
    if (!candidate.startsWith(root + sep) && candidate !== root) continue;
    if (existsSync(candidate) && statSync(candidate).isFile() && existsExactly(candidate)) return candidate;
  }
  return undefined;
}

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://localhost:${port}`);
  const file = resolveFile(url.pathname);

  if (file) {
    send(request, response, 200, file, contentType(file));
    return;
  }

  const notFound = join(root, "404.html");
  if (existsSync(notFound)) {
    send(request, response, 404, notFound, "text/html; charset=utf-8");
    return;
  }

  response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
  response.end("404 Not Found");
});

server.listen(port, () => {
  console.log(`serve-static: ${root} on http://localhost:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
