import { expect, test } from "@playwright/test";
import {
  PAGES,
  RICH_POST,
  RICH_POST_ZH,
  collectConsole,
  expectCanonical,
  expectNoConsoleFailures,
  expectOk,
  expectSingleH1,
  expectSiteChrome,
  hreflangLinks
} from "./support/site";

const HOME_PAGES = [
  { path: PAGES.homeEn, lang: "en", h1: /build frontend systems/i },
  { path: PAGES.homeZh, lang: "zh-CN", h1: /[一-鿿]/ }
] as const;

test.describe("home", () => {
  for (const home of HOME_PAGES) {
    test(`${home.path} renders a complete home page`, async ({ page }) => {
      const console_ = collectConsole(page);
      const response = await page.goto(home.path);
      expectOk(response, home.path);

      await expect(page.locator("html")).toHaveAttribute("lang", home.lang);
      expect(await expectSingleH1(page)).toMatch(home.h1);
      await expectSiteChrome(page);
      await expectCanonical(page, home.path);

      // A home page must link into every top-level section.
      for (const href of ["/writing/", "/projects/", "/about/"]) {
        const localized = home.lang === "zh-CN" ? `/zh${href}` : href;
        await expect(page.locator(`a[href="${localized}"]`).first()).toBeAttached();
      }

      expectNoConsoleFailures(console_.failures());
    });
  }

  test("home pages declare a reciprocal hreflang cluster", async ({ page }) => {
    await page.goto(PAGES.homeEn);
    expect(await hreflangLinks(page)).toEqual([
      { hreflang: "en", href: "https://clean99.github.io/" },
      { hreflang: "x-default", href: "https://clean99.github.io/" },
      { hreflang: "zh-CN", href: "https://clean99.github.io/zh/" }
    ]);

    await page.goto(PAGES.homeZh);
    expect(await hreflangLinks(page)).toEqual([
      { hreflang: "en", href: "https://clean99.github.io/" },
      { hreflang: "x-default", href: "https://clean99.github.io/" },
      { hreflang: "zh-CN", href: "https://clean99.github.io/zh/" }
    ]);
  });

  test("the language switch preserves the page you are on", async ({ page }) => {
    await page.goto(PAGES.about);
    const switchLink = page.locator("header a[hreflang]").first();
    await expect(switchLink).toHaveAttribute("href", PAGES.aboutZh);
  });
});

test.describe("bilingual routes", () => {
  const PAIRS = [
    { en: PAGES.homeEn, zh: PAGES.homeZh },
    { en: PAGES.about, zh: PAGES.aboutZh },
    { en: PAGES.writing, zh: PAGES.writingZh },
    { en: PAGES.projects, zh: PAGES.projectsZh },
    { en: PAGES.tags, zh: PAGES.tagsZh }
  ];

  for (const pair of PAIRS) {
    test(`${pair.en} and ${pair.zh} point at each other`, async ({ page }) => {
      await page.goto(pair.en);
      expect(await hreflangLinks(page)).toContainEqual({
        hreflang: "zh-CN",
        href: `https://clean99.github.io${pair.zh}`
      });
      await page.goto(pair.zh);
      expect(await hreflangLinks(page)).toContainEqual({
        hreflang: "en",
        href: `https://clean99.github.io${pair.en}`
      });
    });
  }
});

test.describe("section indexes", () => {
  const sections = [PAGES.writing, PAGES.projects, PAGES.about, PAGES.tags, PAGES.writingZh, PAGES.projectsZh];
  for (const path of sections) {
    test(`${path} is well-formed`, async ({ page }) => {
      const console_ = collectConsole(page);
      expectOk(await page.goto(path), path);
      await expectSingleH1(page);
      await expectSiteChrome(page);
      await expectCanonical(page, path);
      expectNoConsoleFailures(console_.failures());
    });
  }

  test("writing lists posts that link to real pages", async ({ page }) => {
    await page.goto(PAGES.writing);
    const links = page.locator('main a[href^="/20"]');
    expect(await links.count()).toBeGreaterThan(3);
    const href = await links.first().getAttribute("href");
    expectOk(await page.goto(href!), href!);
    await expectSingleH1(page);
  });

  test("tags index lists topics", async ({ page }) => {
    await page.goto(PAGES.tags);
    expect(await page.locator('main a[href*="/tags/"]').count()).toBeGreaterThan(1);
  });
});

test.describe("a long post with images and code", () => {
  for (const path of [RICH_POST, RICH_POST_ZH]) {
    test(`${path} renders images and code`, async ({ page }) => {
      const console_ = collectConsole(page);
      expectOk(await page.goto(path), path);

      await expectSingleH1(page);
      await expectCanonical(page, path);
      await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);

      // Images: every one resolves, carries alt text, and is served locally.
      // They are `loading="lazy"`, so each has to be scrolled into view before
      // the browser will fetch it.
      const images = page.locator("article img");
      expect(await images.count()).toBeGreaterThan(2);
      for (const image of await images.all()) {
        const src = await image.getAttribute("src");
        expect(src, "img src").toBeTruthy();
        expect(src!.startsWith("/img/")).toBe(true);
        await expect(image).toHaveAttribute("alt", /.+/);
        await expect(image).toHaveAttribute("loading", "lazy");

        await image.scrollIntoViewIfNeeded();
        await expect
          .poll(async () => image.evaluate((node: HTMLImageElement) => node.naturalWidth), { timeout: 10_000 })
          .toBeGreaterThan(0);
      }

      // Code: expressive-code renders a real <pre><code> block with a copy affordance.
      expect(await page.locator("article pre code").count()).toBeGreaterThan(0);

      expectNoConsoleFailures(console_.failures());
    });
  }

  test("post page carries article metadata for crawlers", async ({ page }) => {
    await page.goto(RICH_POST);

    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute("content", "article");
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      /\/og\/en\/Designing-an-Operations-Heartbeat-System\.png$/
    );
    await expect(page.locator('meta[property="article:published_time"]')).toHaveCount(1);

    // JSON-LD must parse and describe the post.
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const graph = blocks.flatMap((block) => JSON.parse(block)["@graph"] ?? []);
    expect(graph.some((node: { "@type": string }) => node["@type"] === "BlogPosting")).toBe(true);
    expect(graph.some((node: { "@type": string }) => node["@type"] === "BreadcrumbList")).toBe(true);

    // The plain-markdown twin that LLM crawlers can lift wholesale.
    await expect(page.locator('link[rel="alternate"][type="text/markdown"]')).toHaveAttribute(
      "href",
      `${RICH_POST}index.md`
    );
  });
});
