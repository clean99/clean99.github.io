/**
 * Shared fixtures and helpers for the E2E suite.
 *
 * The suite runs against a production build served by `scripts/serve-static.mjs`
 * on port 4334, so every assertion here describes the shipped site rather than a
 * dev-server approximation.
 */
import { expect, type Page, type Response } from "@playwright/test";
import { consoleFailures, describeConsoleFailures, type ConsoleMessage } from "./console";

/** Pages every run exercises: home in both languages, then one of each section. */
export const PAGES = {
  homeEn: "/",
  homeZh: "/zh/",
  writing: "/writing/",
  writingZh: "/zh/writing/",
  projects: "/projects/",
  projectsZh: "/zh/projects/",
  about: "/about/",
  aboutZh: "/zh/about/",
  tags: "/tags/",
  tagsZh: "/zh/tags/"
} as const;

/**
 * A long post with inline images and fenced code, used for the image and
 * accessibility checks. The heartbeat write-up carries the most figures.
 */
export const RICH_POST = "/2026/06/19/Designing-an-Operations-Heartbeat-System/";
export const RICH_POST_ZH = "/zh/2026/06/19/Designing-an-Operations-Heartbeat-System/";

/** Attach a console collector to a page and return the failures seen so far. */
export function collectConsole(page: Page): { messages: ConsoleMessage[]; failures: () => ConsoleMessage[] } {
  const messages: ConsoleMessage[] = [];
  page.on("console", (message) => messages.push({ type: message.type(), text: message.text() }));
  page.on("pageerror", (error) => messages.push({ type: "error", text: error.message }));
  return { messages, failures: () => consoleFailures(messages) };
}

export function expectNoConsoleFailures(failures: ConsoleMessage[]): void {
  expect(failures, `console errors:\n${describeConsoleFailures(failures)}`).toEqual([]);
}

/** Assert a response, surfacing the URL so a 404 names the page that broke. */
export function expectOk(response: Response | null, url: string): void {
  expect(response, `no response for ${url}`).not.toBeNull();
  expect(response!.status(), `${url} responded ${response!.status()}`).toBe(200);
}

/** Exactly one `<h1>`, and it must be the visible page heading. */
export async function expectSingleH1(page: Page): Promise<string> {
  const headings = page.locator("h1");
  await expect(headings).toHaveCount(1);
  const text = (await headings.first().innerText()).trim();
  expect(text.length).toBeGreaterThan(0);
  await expect(headings.first()).toBeVisible();
  return text;
}

export async function expectCanonical(page: Page, path: string): Promise<void> {
  const href = await page.locator('link[rel="canonical"]').getAttribute("href");
  expect(href).toBe(`https://clean99.github.io${path}`);
}

/** hreflang links, sorted, excluding the self-referencing entry. */
export async function hreflangLinks(page: Page): Promise<{ hreflang: string; href: string }[]> {
  const links = await page.locator('link[rel="alternate"][hreflang]').evaluateAll((nodes) =>
    nodes.map((node) => ({
      hreflang: node.getAttribute("hreflang") ?? "",
      href: node.getAttribute("href") ?? ""
    }))
  );
  return links.sort((a, b) => a.hreflang.localeCompare(b.hreflang));
}

/** Header/footer chrome present on every page. */
export async function expectSiteChrome(page: Page): Promise<void> {
  await expect(page.locator("header.site-header")).toBeVisible();
  await expect(page.locator("main#main")).toBeVisible();
  await expect(page.locator("footer")).toBeVisible();
  // The search trigger carries the label in the page's own language, so match
  // its hook rather than its text.
  await expect(page.locator("[data-search-open]").first()).toBeAttached();
  await expect(page.locator("a.skip-link")).toBeAttached();
}

/** The theme the document is currently rendering. */
export async function currentTheme(page: Page): Promise<string> {
  return (await page.locator("html").getAttribute("data-theme")) ?? "";
}
