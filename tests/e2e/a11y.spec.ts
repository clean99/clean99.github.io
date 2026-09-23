import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { PAGES, RICH_POST } from "./support/site";

/**
 * WCAG 2.0/2.1/2.2 A + AA, scanned in light and dark. The theme is applied by
 * writing the same `data-theme` attribute the site's own toggle writes, so the
 * scan sees exactly the palette a reader sees.
 */
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

const SCANNED = [PAGES.homeEn, PAGES.homeZh, RICH_POST, PAGES.writing, PAGES.projects, PAGES.about, PAGES.tags];

async function scan(page: Page, theme: "light" | "dark") {
  await page.emulateMedia({ colorScheme: theme });
  await page.evaluate((value) => {
    document.documentElement.dataset.theme = value;
  }, theme);
  // Links and buttons ease their colours over up to 0.2s, and axe samples whatever is on screen,
  // so a fixed pause lets a busy machine catch them halfway. Wait for every time-based animation
  // to finish instead; scroll-driven ones (the reading progress bar) never finish on their own.
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((animation) => animation.timeline === document.timeline)
        .filter((animation) => animation.effect?.getComputedTiming().endTime !== Infinity)
        .map((animation) => animation.finished.catch(() => undefined))
    )
  );

  const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  return violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    nodes: violation.nodes.map((node) => node.target.join(" "))
  }));
}

for (const path of SCANNED) {
  for (const theme of ["light", "dark"] as const) {
    test(`${path} has no accessibility violations (${theme})`, async ({ page }) => {
      const response = await page.goto(path, { waitUntil: "load" });
      // A page that is not in this build yet would make axe report the 404 page's
      // problems as if they belonged to the real page, so name that case clearly.
      expect(response!.status(), `${path} is not in this build`).toBe(200);
      await expect(page.locator("html")).toHaveAttribute("lang", /\w+/);
      await expect(page.locator("title")).not.toBeEmpty();
      expect(await scan(page, theme), `axe violations on ${path} in ${theme} mode`).toEqual([]);
    });
  }
}

test("the skip link is focusable and targets main", async ({ page }) => {
  await page.goto(PAGES.homeEn);
  await page.keyboard.press("Tab");
  const skip = page.locator("a.skip-link");
  await expect(skip).toBeFocused();
  await expect(skip).toHaveAttribute("href", "#main");
});

test("interactive controls expose accessible names", async ({ page }) => {
  await page.goto(PAGES.homeEn);
  for (const selector of ["[data-theme-toggle]", "[data-search-open]", "header a[hreflang]"]) {
    const control = page.locator(selector).first();
    const name = (await control.getAttribute("aria-label")) ?? (await control.innerText());
    expect(name, `${selector} needs an accessible name`).toBeTruthy();
  }
});

test("images on a rich post all carry alt text", async ({ page }) => {
  await page.goto(RICH_POST);
  const images = await page.locator("article img").all();
  expect(images.length).toBeGreaterThan(0);
  for (const image of images) {
    await expect(image).toHaveAttribute("alt", /.+/);
  }
});
