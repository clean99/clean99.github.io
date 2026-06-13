import { expect, type Page, test } from "@playwright/test";
import { startStaticBlogServer, type StaticBlogServer } from "../support/static-blog-server";

let server: StaticBlogServer;

test.beforeAll(async () => {
  server = await startStaticBlogServer();
});

test.afterAll(async () => {
  await server.close();
});

test("static export serves all core public routes", async ({ page }) => {
  const issues = collectRuntimeIssues(page);
  const corePages = [
    { heading: "Koh Hom", pathname: "/" },
    { heading: "Essays and notes", pathname: "/writing/" },
    { heading: "Selected technical work", pathname: "/projects/" },
    { heading: "Agent workflow catalog", pathname: "/ai-coding-lab/" },
    { heading: "About", pathname: "/about/" },
    { heading: "About", pathname: "/About/" },
    { heading: "许峰 / Koh Hom", pathname: "/zh/" }
  ];

  for (const route of corePages) {
    await gotoPath(page, route.pathname);
    await expect(page.getByRole("heading", { level: 1, name: route.heading })).toBeVisible();
  }

  expect(issues).toEqual([]);
});

test("home navigation and calls to action stay interviewers-free", async ({ page }) => {
  const issues = collectRuntimeIssues(page);
  await gotoPath(page, "/");

  const nav = page.getByRole("navigation", { name: "Primary navigation" });
  await expect(nav).toBeVisible();
  await expect(nav.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
  await expect(nav.getByRole("link", { name: "Writing" })).toHaveAttribute("href", "/writing/");
  await expect(nav.getByRole("link", { name: "Projects" })).toHaveAttribute("href", "/projects/");
  await expect(nav.getByRole("link", { name: "AI Lab" })).toHaveAttribute(
    "href",
    "/ai-coding-lab/"
  );
  await expect(nav.getByRole("link", { name: "About" })).toHaveAttribute("href", "/about/");
  await expect(nav.getByRole("link", { name: "中文 / EN" })).toHaveAttribute("href", "/zh/");
  await expect(nav).not.toContainText(/Interviewers|For Interviewers/i);
  await expect(page.locator("main")).not.toContainText(/Interviewers|For Interviewers/i);
  await expect(page.locator("footer")).not.toContainText(/Interviewers|For Interviewers/i);

  const ctas = [
    { heading: "Essays and notes", name: "Read Writing", pathname: "/writing/" },
    { heading: "Selected technical work", name: "View Projects", pathname: "/projects/" },
    { heading: "Agent workflow catalog", name: "Explore AI Lab", pathname: "/ai-coding-lab/" }
  ];

  for (const cta of ctas) {
    await gotoPath(page, "/");
    await page.getByRole("link", { name: cta.name }).click();
    await expect(page).toHaveURL(new URL(cta.pathname, server.origin).toString());
    await expect(page.getByRole("heading", { level: 1, name: cta.heading })).toBeVisible();
  }

  expect(issues).toEqual([]);
});

test("primary navigation works by click and keyboard", async ({ page }) => {
  const issues = collectRuntimeIssues(page);
  await gotoPath(page, "/");

  const navLinks = [
    { heading: "Essays and notes", name: "Writing", pathname: "/writing/" },
    { heading: "Selected technical work", name: "Projects", pathname: "/projects/" },
    { heading: "Agent workflow catalog", name: "AI Lab", pathname: "/ai-coding-lab/" },
    { heading: "About", name: "About", pathname: "/about/" },
    { heading: "许峰 / Koh Hom", name: "中文 / EN", pathname: "/zh/" }
  ];

  for (const link of navLinks) {
    await gotoPath(page, "/");
    await page
      .getByRole("navigation", { name: "Primary navigation" })
      .getByRole("link", {
        name: link.name
      })
      .click();
    await expect(page).toHaveURL(new URL(link.pathname, server.origin).toString());
    await expect(page.getByRole("heading", { level: 1, name: link.heading })).toBeVisible();
  }

  await gotoPath(page, "/");
  const nav = page.getByRole("navigation", { name: "Primary navigation" });
  await page.keyboard.press("Tab");
  await expect(nav.getByRole("link", { name: "Home" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(nav.getByRole("link", { name: "Writing" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(nav.getByRole("link", { name: "Projects" })).toBeFocused();

  expect(issues).toEqual([]);
});

test("representative migrated articles load at their legacy URLs", async ({ page }) => {
  const issues = collectRuntimeIssues(page);
  const articles = [
    {
      heading: "Workspace v2 tab system: browser tabs inside a workspace",
      pathname: "/2026/05/18/Workspace-v2-Tab-System-Browser-Grade-Tabs/"
    },
    {
      heading:
        "Workspace v2 tab system performance: first load, hot switch, and background pressure",
      pathname:
        "/2026/05/18/Workspace-v2-Tab-System-Performance-First-Load-Hot-Switch-Background-Pressure/"
    },
    {
      heading: "JavaScript garbage collection: generations, hosts, and leaks",
      pathname: "/2026/06/08/JavaScript-Garbage-Collection-Generations-Hosts-Leaks/"
    },
    {
      heading: "Workspace v2 Tab System：把浏览器标签页带进工作空间",
      pathname: "/zh/2026/05/18/Workspace-v2-Tab-System-Browser-Grade-Tabs/"
    }
  ];

  for (const article of articles) {
    await gotoPath(page, article.pathname);
    await expect(page.getByRole("heading", { level: 1, name: article.heading })).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to writing" })).toHaveAttribute(
      "href",
      "/writing/"
    );
  }

  expect(issues).toEqual([]);
});

test("static metadata and core assets are exported", async ({ request }) => {
  const assets = [
    { contains: "<feed", pathname: "/atom.xml" },
    { contains: "<urlset", pathname: "/sitemap.xml" },
    { contains: "Sitemap:", pathname: "/robots.txt" },
    { contains: "Koh Hom", pathname: "/llms.txt" },
    { pathname: "/404.html" },
    { pathname: "/favicon.png" },
    { pathname: "/thumbnail.jpg" }
  ];

  for (const asset of assets) {
    const response = await request.get(new URL(asset.pathname, server.origin).toString());
    expect(response.status(), asset.pathname).toBe(200);

    if (asset.contains) {
      await expect(response.text()).resolves.toContain(asset.contains);
    }
  }
});

async function gotoPath(page: Page, pathname: string) {
  const response = await page.goto(new URL(pathname, server.origin).toString(), {
    waitUntil: "networkidle"
  });

  expect(response?.status(), pathname).toBe(200);
}

function collectRuntimeIssues(page: Page) {
  const issues: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      issues.push(`console: ${message.text()}`);
    }
  });

  page.on("pageerror", (error) => {
    issues.push(`pageerror: ${error.message}`);
  });

  page.on("response", (response) => {
    if (response.url().startsWith(server.origin) && response.status() >= 400) {
      issues.push(`response: ${response.status()} ${response.url()}`);
    }
  });

  return issues;
}
