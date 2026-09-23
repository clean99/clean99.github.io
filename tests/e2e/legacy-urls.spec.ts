import { expect, test } from "@playwright/test";
import { PAGES, RICH_POST, collectConsole, expectNoConsoleFailures, expectOk, expectSingleH1 } from "./support/site";

/**
 * GitHub Pages serves a single `404.html` with status 404 for every unmatched
 * path. Case variants of live pages (`/About/`) and retired sections that could
 * not get a static stub are recovered by that page's own script, so these tests
 * follow the redirect the same way a browser would.
 */

test.describe("case-insensitive legacy URLs", () => {
  const CASES = [
    { request: "/About/", expected: "/about/" },
    { request: "/Links/", expected: "/links/" },
    { request: "/tags/Frontend/", expected: "/tags/frontend/" }
  ];

  for (const { request, expected } of CASES) {
    test(`${request} lands on ${expected}`, async ({ page }) => {
      // The 404 page answers with status 404 and then rewrites the location.
      const response = await page.goto(request);
      expect(response!.status()).toBe(404);

      await page.waitForURL(`**${expected}`, { timeout: 10_000 });
      await expectSingleH1(page);
      expectOk(await page.goto(expected), expected);
    });
  }
});

test.describe("redirect stubs", () => {
  test("/interviewers/ lands on /projects/", async ({ page }) => {
    const console_ = collectConsole(page);
    expectOk(await page.goto("/interviewers/"), "/interviewers/");
    await page.waitForURL("**/projects/", { timeout: 10_000 });
    await expectSingleH1(page);
    expectNoConsoleFailures(console_.failures());
  });

  test("/zh/interviewers/ lands on /zh/projects/", async ({ page }) => {
    expectOk(await page.goto("/zh/interviewers/"), "/zh/interviewers/");
    await page.waitForURL("**/zh/projects/", { timeout: 10_000 });
    await expectSingleH1(page);
  });

  test("/Works/ lands on /projects/", async ({ page }) => {
    expectOk(await page.goto("/Works/"), "/Works/");
    await page.waitForURL("**/projects/", { timeout: 10_000 });
    await expectSingleH1(page);
  });

  test("/archives/ lands on /writing/", async ({ page }) => {
    expectOk(await page.goto("/archives/"), "/archives/");
    await page.waitForURL("**/writing/", { timeout: 10_000 });
    await expectSingleH1(page);
  });

  test("a stub offers a plain link for clients that ignore meta refresh", async ({ page }) => {
    // Browsers may disable meta refresh, and some crawlers do not follow it.
    const response = await page.request.get("/interviewers/");
    const html = await response.text();
    expect(html).toContain('href="/projects/"');
  });
});

test.describe("retired but preserved URLs", () => {
  test("/404 resolves rather than dead-ending", async ({ page }) => {
    const response = await page.goto("/404");
    expect([200, 404]).toContain(response!.status());
    await expect(page.locator("main")).toBeVisible();
  });

  test("an unknown path serves the 404 page with a way home", async ({ page }) => {
    const response = await page.goto("/definitely-not-a-page/");
    expect(response!.status()).toBe(404);
    await expect(page.locator("main")).toBeVisible();
    // The reader is never stranded.
    await expect(page.locator('a[href="/"]').first()).toBeAttached();
  });
});

test.describe("responsive layout", () => {
  test("a 390px viewport has no horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of [PAGES.homeEn, RICH_POST, PAGES.writing, PAGES.tags, PAGES.about]) {
      await page.goto(path);
      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth
      }));
      expect(overflow.scrollWidth, `${path} overflows at 390px`).toBeLessThanOrEqual(overflow.clientWidth + 1);
    }
  });

  test("no element is clipped at 390px on a rich post", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(RICH_POST);

    // Wide tables get their own horizontal scroller, which is correct; what must
    // never happen is the document itself scrolling sideways. Overflowing
    // elements therefore only count when they escape a scroll container.
    const offenders = await page.evaluate(() => {
      const clipped = (node: Element) => {
        for (let parent = node.parentElement; parent; parent = parent.parentElement) {
          const overflowX = getComputedStyle(parent).overflowX;
          if (overflowX === "auto" || overflowX === "scroll" || overflowX === "hidden") return false;
        }
        return true;
      };
      return [...document.querySelectorAll("body *")]
        .filter((node) => node.getBoundingClientRect().right > 391 && clipped(node))
        .map((node) => `${node.tagName}.${String(node.className).slice(0, 40)}`);
    });
    expect(offenders).toEqual([]);

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
  });
});
