import fs from "node:fs";
import http, { type Server } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";

export type StaticBlogServer = {
  origin: string;
  outDir: string;
  close: () => Promise<void>;
};

const contentTypes = new Map<string, string>([
  [".css", "text/css; charset=utf-8"],
  [".gif", "image/gif"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"],
  [".webp", "image/webp"],
  [".xml", "application/xml; charset=utf-8"]
]);

export async function startStaticBlogServer(
  outDir = path.join(process.cwd(), "apps", "blog", "out")
): Promise<StaticBlogServer> {
  const root = path.resolve(outDir);

  if (!fs.existsSync(root)) {
    throw new Error(`Blog export does not exist: ${root}`);
  }

  const server = http.createServer((request, response) => {
    const result = resolveStaticFile(root, request.url ?? "/");

    if (!result) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    response.writeHead(result.found ? 200 : 404, {
      "cache-control": "no-store",
      "content-type": contentTypes.get(path.extname(result.filePath)) ?? "application/octet-stream"
    });

    if (request.method === "HEAD") {
      response.end();
      return;
    }

    fs.createReadStream(result.filePath).pipe(response);
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });

  const address = server.address() as AddressInfo;

  return {
    origin: `http://127.0.0.1:${address.port}`,
    outDir: root,
    close: () => closeServer(server)
  };
}

function resolveStaticFile(root: string, requestUrl: string) {
  const url = new URL(requestUrl, "http://127.0.0.1");
  const pathname = decodeURIComponent(url.pathname);
  const relativePath = path.normalize(pathname).replace(/^[/\\]+/, "");
  const candidates = pathname.endsWith("/")
    ? [path.join(root, relativePath, "index.html")]
    : [path.join(root, relativePath), path.join(root, relativePath, "index.html")];

  for (const candidate of candidates) {
    if (isSafeFile(root, candidate)) {
      return { filePath: candidate, found: true };
    }
  }

  const notFound = path.join(root, "404.html");
  return isSafeFile(root, notFound) ? { filePath: notFound, found: false } : null;
}

function isSafeFile(root: string, candidate: string) {
  const resolved = path.resolve(candidate);
  const insideRoot = resolved === root || resolved.startsWith(`${root}${path.sep}`);
  return insideRoot && fs.existsSync(resolved) && fs.statSync(resolved).isFile();
}

async function closeServer(server: Server) {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}
