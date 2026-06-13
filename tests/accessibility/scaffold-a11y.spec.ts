import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { startStaticBlogServer, type StaticBlogServer } from "../support/static-blog-server";

let server: StaticBlogServer;

test.beforeAll(async () => {
  server = await startStaticBlogServer();
});

test.afterAll(async () => {
  await server.close();
});

const accessibilityPages = [
  { name: "home", pathname: "/" },
  { name: "writing", pathname: "/writing/" },
  {
    name: "article",
    pathname: "/2026/05/18/Workspace-v2-Tab-System-Browser-Grade-Tabs/"
  }
];

for (const pageSpec of accessibilityPages) {
  test(`${pageSpec.name} has no critical or serious axe violations`, async ({ page }) => {
    const response = await page.goto(new URL(pageSpec.pathname, server.origin).toString(), {
      waitUntil: "networkidle"
    });

    expect(response?.status(), pageSpec.pathname).toBe(200);
    await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
    await expect(page.getByRole("link", { name: "中文 / EN" })).toHaveAttribute("href", "/zh/");

    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter((violation) =>
      ["critical", "serious"].includes(violation.impact ?? "")
    );

    expect(serious).toEqual([]);
  });
}
