import { expect, test } from "@playwright/test";
import { PAGES, collectConsole, currentTheme, expectNoConsoleFailures } from "./support/site";

const THEME_KEY = "theme";

test.describe("theme", () => {
  test("follows the OS preference when nothing is stored", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto(PAGES.homeEn);
    expect(await currentTheme(page)).toBe("dark");

    await page.emulateMedia({ colorScheme: "light" });
    await page.goto(PAGES.homeEn);
    expect(await currentTheme(page)).toBe("light");
  });

  test("the toggle flips the theme and survives a full page load", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto(PAGES.homeEn);
    expect(await currentTheme(page)).toBe("light");

    const toggle = page.locator("[data-theme-toggle]").first();
    await toggle.click();
    expect(await currentTheme(page)).toBe("dark");
    await expect(toggle).toHaveAttribute("aria-pressed", "true");

    // A full navigation must keep the choice: the inline head script reads the
    // stored value before first paint, so there is no light flash on the way in.
    await page.goto(PAGES.writingZh);
    expect(await currentTheme(page)).toBe("dark");
    await expect(page.locator("[data-theme-toggle]").first()).toHaveAttribute("aria-pressed", "true");

    // And it survives a second hop, not just one.
    await page.goto(PAGES.projectsZh);
    expect(await currentTheme(page)).toBe("dark");
  });

  test("a client-side navigation keeps the theme on the document element", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto(PAGES.homeEn);
    await page.locator("[data-theme-toggle]").first().click();
    expect(await currentTheme(page)).toBe("dark");

    // Astro prefetching navigates in place; the attribute must be re-applied.
    await page.locator('header nav a[href="/zh/"]').first().click();
    await page.waitForURL("**/zh/");
    expect(await currentTheme(page)).toBe("dark");
  });

  test("choosing the OS theme forgets the stored override", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto(PAGES.homeEn);
    const toggle = page.locator("[data-theme-toggle]").first();

    await toggle.click();
    expect(await currentTheme(page)).toBe("light");
    expect(await page.evaluate((key) => localStorage.getItem(key), THEME_KEY)).toBe("light");

    // Flipping back to the OS theme drops the key, so the OS stays in charge.
    await toggle.click();
    expect(await currentTheme(page)).toBe("dark");
    expect(await page.evaluate((key) => localStorage.getItem(key), THEME_KEY)).toBeNull();
  });

  test("a stored choice is applied before first paint", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.addInitScript((key) => localStorage.setItem(key, "dark"), THEME_KEY);
    await page.goto(PAGES.homeEn);
    // The inline head script sets the attribute, so no light flash is possible.
    expect(await currentTheme(page)).toBe("dark");
  });
});

test.describe("search", () => {
  test("opens with Ctrl+K and returns results for a real query", async ({ page }) => {
    const console_ = collectConsole(page);
    await page.goto(PAGES.homeEn);

    await page.keyboard.press("ControlOrMeta+k");
    const dialog = page.locator("dialog[data-search-dialog]");
    await expect(dialog).toBeVisible();
    await expect(page.locator("[data-search-input]")).toBeFocused();

    await page.locator("[data-search-input]").fill("performance");
    const results = page.locator("[data-search-results] a");
    await expect(results.first()).toBeVisible({ timeout: 10_000 });
    expect(await results.count()).toBeGreaterThan(0);

    // The dialog reports the count it rendered.
    await expect(page.locator("[data-search-status]")).toHaveText(/result/i);

    // A native search input consumes the first Escape to clear itself; the
    // dialog closes on the next one.
    await page.locator("[data-search-input]").press("Escape");
    await expect(page.locator("[data-search-input]")).toHaveValue("");
    await expect(dialog).toBeVisible();
    await page.locator("[data-search-input]").press("Escape");
    await expect(dialog).toBeHidden();

    expectNoConsoleFailures(console_.failures());
  });

  test("a result navigates to the page it names", async ({ page }) => {
    await page.goto(PAGES.homeEn);
    await page.locator("[data-search-open]").first().click();
    await page.locator("[data-search-input]").fill("heartbeat");

    const first = page.locator("[data-search-results] a").first();
    await expect(first).toBeVisible({ timeout: 10_000 });
    const href = await first.getAttribute("href");
    expect(href).toBeTruthy();

    await first.click();
    await page.waitForURL(`**${href}`);
    await expect(page.locator("h1")).toHaveCount(1);
  });

  test("an unmatched query reports zero results without erroring", async ({ page }) => {
    const console_ = collectConsole(page);
    await page.goto(PAGES.homeEn);
    await page.locator("[data-search-open]").first().click();

    // Pagefind matches fuzzily, so a nonsense Latin string can still hit
    // something; symbols absent from the index reliably return nothing.
    await page.locator("[data-search-input]").fill("!!!");
    const dialog = page.locator("dialog[data-search-dialog]");
    const emptyCopy = (await dialog.getAttribute("data-empty")) ?? "";
    expect(emptyCopy).toBeTruthy();

    await expect(page.locator("[data-search-status]")).toHaveText(emptyCopy, { timeout: 10_000 });
    await expect(page.locator("[data-search-results] a")).toHaveCount(0);
    expectNoConsoleFailures(console_.failures());
  });

  test("the search button opens the dialog for keyboard and pointer users", async ({ page }) => {
    await page.goto(PAGES.about);
    const trigger = page.locator("[data-search-open]").first();
    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("dialog[data-search-dialog]")).toBeVisible();
  });
});
