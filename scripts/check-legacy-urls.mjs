#!/usr/bin/env node
/**
 * Verify that every URL the live site has ever published still resolves in a
 * fresh build, using GitHub Pages' own resolution rules.
 *
 *   node scripts/check-legacy-urls.mjs [distDir]
 *
 * Exit code is 1 when any URL is unreachable, so CI fails on a broken link
 * instead of shipping a 404 to a reader who followed an old bookmark.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { checkUrls, failures, formatReport, parseCaseMap } from "./lib/legacy-check.mjs";

const distDir = process.argv[2] || "dist";
const fixtures = new URL("../tests/fixtures/legacy-urls.txt", import.meta.url);

if (!existsSync(distDir)) {
  console.error(`check-legacy-urls: build directory not found: ${distDir}`);
  process.exit(1);
}

const context = {
  exists: (rel) => existsSync(join(distDir, rel)) && statSync(join(distDir, rel)).isFile(),
  read: (rel) => readFileSync(join(distDir, rel), "utf8"),
  caseMap: {}
};

// The case map lives in the 404 page: paths that differ only in case cannot
// coexist on a case-insensitive build disk, so that is where they are resolved.
const notFoundPath = join(distDir, "404.html");
if (existsSync(notFoundPath)) {
  context.caseMap = parseCaseMap(readFileSync(notFoundPath, "utf8"));
}

const urls = readFileSync(fixtures, "utf8")
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean);

const results = checkUrls(urls, context);
console.log(formatReport(results));

const caseRecovered = results.filter((result) => result.kind === "case").length;
if (caseRecovered > 0) {
  console.log(
    `\n${caseRecovered} URL(s) are recovered by the 404 page's case map. GitHub Pages answers those\n` +
      `with HTTP 404 and the page redirects client-side, which crawlers follow but a plain\n` +
      `HTTP status check will still read as 404.`
  );
}

const failed = failures(results);
if (failed.length > 0) {
  console.error(`\n${failed.length} legacy URL(s) do not resolve in ${distDir}`);
  process.exit(1);
}
