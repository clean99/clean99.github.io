import fs from "node:fs";
import path from "node:path";

export const siteUrl = "https://clean99.github.io";

export function getRepoRoot(): string {
  let current = process.cwd();

  while (current !== path.dirname(current)) {
    if (fs.existsSync(path.join(current, "source", "_posts"))) {
      return current;
    }
    current = path.dirname(current);
  }

  throw new Error(`Cannot find repository root from ${process.cwd()}`);
}

export function getSourcePath(...segments: string[]): string {
  return path.join(getRepoRoot(), "source", ...segments);
}

export function getBlogPath(...segments: string[]): string {
  return path.join(getRepoRoot(), "apps", "blog", ...segments);
}

export function withTrailingSlash(url: string): string {
  return url.endsWith("/") ? url : `${url}/`;
}

export function absoluteUrl(pathname: string): string {
  return `${siteUrl}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}
