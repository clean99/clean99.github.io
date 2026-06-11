import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("scaffold navigation has no serious accessibility violations", async ({ page }) => {
  await page.setContent(`
    <!doctype html>
    <html lang="en">
      <head>
        <title>Accessibility scaffold</title>
      </head>
      <body>
        <main>
          <nav aria-label="Primary navigation">
            <a href="/writing/">Writing</a>
            <a href="/projects/">Projects</a>
            <button type="button" aria-pressed="false">Theme</button>
          </nav>
        </main>
      </body>
    </html>
  `);

  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((violation) =>
    ["critical", "serious"].includes(violation.impact ?? "")
  );

  expect(serious).toEqual([]);
});
