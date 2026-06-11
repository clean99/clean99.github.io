import { expect, test } from "@playwright/test";

test("monorepo scaffold exposes core routes as links", async ({ page }) => {
  await page.setContent(`
    <main>
      <nav aria-label="Primary navigation">
        <a href="/writing/">Writing</a>
        <a href="/projects/">Projects</a>
        <a href="/ai-coding-lab/">AI Lab</a>
        <a href="/About/">About</a>
      </nav>
    </main>
  `);

  await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Writing" })).toHaveAttribute("href", "/writing/");
  await expect(page.getByRole("link", { name: "AI Lab" })).toHaveAttribute(
    "href",
    "/ai-coding-lab/"
  );
});
