import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { getBlogPath } from "../lib/paths";

export type AboutCompatibilityOptions = {
  outDir?: string;
  serverAppDir?: string;
};

export function ensureAboutCompatibilityRoutes({
  outDir = getBlogPath("out"),
  serverAppDir = getBlogPath(".next", "server", "app")
}: AboutCompatibilityOptions = {}) {
  const sourceDir = path.join(outDir, "about");
  if (isDirectory(sourceDir)) {
    copyRouteDirectory(sourceDir, path.join(outDir, "About"));
    return;
  }

  const sourceHtml = findFirstExistingFile([
    path.join(outDir, "about.html"),
    path.join(serverAppDir, "about.html")
  ]);

  if (!sourceHtml) {
    throw new Error("Cannot create /about/ compatibility route: no rendered about HTML was found");
  }

  writeStaticRoute(outDir, "about", sourceHtml);
  writeStaticRoute(outDir, "About", sourceHtml);
}

function isDirectory(candidate: string) {
  try {
    return fs.statSync(candidate).isDirectory();
  } catch {
    return false;
  }
}

function findFirstExistingFile(candidates: string[]) {
  return candidates.find((candidate) => {
    try {
      return fs.statSync(candidate).isFile();
    } catch {
      return false;
    }
  });
}

function writeStaticRoute(outDir: string, route: string, sourceHtml: string) {
  const routeDir = path.join(outDir, route);
  const targetHtml = path.join(routeDir, "index.html");

  if (fs.existsSync(routeDir) && !fs.statSync(routeDir).isDirectory()) {
    fs.rmSync(routeDir, { force: true });
  }

  fs.mkdirSync(routeDir, { recursive: true });

  if (path.resolve(sourceHtml) !== path.resolve(targetHtml)) {
    fs.copyFileSync(sourceHtml, targetHtml);
  }
}

function copyRouteDirectory(sourceDir: string, targetDir: string) {
  if (isSameFileSystemPath(sourceDir, targetDir)) {
    return;
  }

  fs.rmSync(targetDir, { recursive: true, force: true });
  fs.cpSync(sourceDir, targetDir, { recursive: true });
}

function isSameFileSystemPath(left: string, right: string) {
  try {
    return fs.realpathSync.native(left) === fs.realpathSync.native(right);
  } catch {
    return path.resolve(left) === path.resolve(right);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  ensureAboutCompatibilityRoutes();
}
