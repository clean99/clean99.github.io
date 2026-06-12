import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getAllPosts } from "../lib/posts";
import { requiredStaticRoutes, siteNavigation } from "../lib/site";
import { ensureAboutCompatibilityRoutes } from "../scripts/post-export";

describe("site scaffold", () => {
  it("keeps Interviewers out of primary navigation", () => {
    expect(siteNavigation.map((item) => item.href)).not.toContain("/interviewers/");
  });

  it("tracks required static compatibility routes", () => {
    expect(requiredStaticRoutes).toContain("/About/");
    expect(requiredStaticRoutes).toContain("/about/");
    expect(requiredStaticRoutes).toContain("/llms.txt");
  });

  it("generates unique canonical post URLs", () => {
    const posts = getAllPosts();
    expect(posts.length).toBeGreaterThanOrEqual(58);
    expect(new Set(posts.map((post) => post.canonicalPath)).size).toBe(posts.length);
  });

  it("materializes lowercase and uppercase About compatibility routes", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "blog-about-export-"));
    const outDir = path.join(tempDir, "out");
    const serverAppDir = path.join(tempDir, ".next", "server", "app");
    const html = "<!doctype html><title>About</title>";

    fs.mkdirSync(serverAppDir, { recursive: true });
    fs.writeFileSync(path.join(serverAppDir, "about.html"), html);

    ensureAboutCompatibilityRoutes({ outDir, serverAppDir });

    expect(fs.readFileSync(path.join(outDir, "about", "index.html"), "utf8")).toBe(html);
    expect(fs.readFileSync(path.join(outDir, "About", "index.html"), "utf8")).toBe(html);
  });

  it("copies the full lowercase about export directory for uppercase compatibility", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "blog-about-export-"));
    const aboutDir = path.join(tempDir, "out", "about");

    fs.mkdirSync(aboutDir, { recursive: true });
    fs.writeFileSync(path.join(aboutDir, "index.html"), "<!doctype html><title>About</title>");
    fs.writeFileSync(path.join(aboutDir, "index.txt"), "about rsc payload");

    ensureAboutCompatibilityRoutes({ outDir: path.join(tempDir, "out") });

    expect(fs.readFileSync(path.join(tempDir, "out", "About", "index.html"), "utf8")).toContain(
      "About"
    );
    expect(fs.readFileSync(path.join(tempDir, "out", "About", "index.txt"), "utf8")).toBe(
      "about rsc payload"
    );
  });
});
