import { AxeBuilder } from "@axe-core/playwright";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { chromium } from "playwright";

const staticDir = path.resolve(process.env.STORYBOOK_STATIC_DIR ?? "storybook-static-a11y");
const artifactDir = path.resolve("test-results/a11y");
const blockingImpacts = new Set(["critical", "serious"]);

const stories = [
  {
    id: "liquid-glass-liquidbutton--focus-visible",
    name: "Button focus-visible",
    readySelector: ".lg-surface--button"
  },
  {
    id: "liquid-glass-liquidnav--blog-navigation-light",
    name: "Blog navigation",
    readySelector: ".lg-nav"
  },
  {
    id: "liquid-glass-liquidtabs--focus-visible",
    name: "Tabs focus-visible",
    readySelector: ".lg-tabs"
  },
  {
    id: "liquid-glass-liquidfield--invalid",
    name: "Invalid field",
    readySelector: ".lg-field"
  },
  {
    id: "liquid-glass-liquiddialog--blog-realistic-example",
    name: "Dialog",
    readySelector: ".lg-dialog"
  },
  {
    id: "liquid-glass-liquidsearchbox--focus-photo-reference",
    name: "Searchbox photo reference",
    readySelector: ".lg-searchbox"
  },
  {
    id: "liquid-glass-liquidlens--draggable-precision-lens",
    name: "Draggable lens",
    readySelector: "[data-lg-draggable-lens]"
  }
];

await fs.mkdir(artifactDir, { recursive: true });

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
  const pathname = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
  const filePath = path.join(staticDir, pathname);

  if (!filePath.startsWith(staticDir)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const body = await fs.readFile(filePath);
    response.writeHead(200, { "content-type": contentType(filePath) });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

const address = server.address();
const port = typeof address === "object" && address ? address.port : 0;
const browser = await chromium.launch({ headless: true });
const summary = [];
const failures = [];

try {
  for (const story of stories) {
    const context = await browser.newContext({ viewport: { width: 900, height: 620 } });
    const page = await context.newPage();
    const consoleErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text());
      }
    });

    await page.goto(`http://127.0.0.1:${port}/iframe.html?id=${story.id}&viewMode=story`, {
      waitUntil: "networkidle",
      timeout: 20_000
    });
    await page.locator(story.readySelector).first().waitFor({ state: "visible", timeout: 10_000 });

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const blocking = results.violations.filter((violation) =>
      blockingImpacts.has(violation.impact ?? "")
    );

    summary.push({
      blocking: blocking.length,
      consoleErrors,
      id: story.id,
      incomplete: results.incomplete.length,
      name: story.name,
      passes: results.passes.length,
      violations: results.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        nodes: violation.nodes.length
      }))
    });

    if (consoleErrors.length > 0) {
      failures.push(
        `${story.name} emitted console errors:\n${consoleErrors.slice(0, 5).join("\n")}`
      );
    }

    for (const violation of blocking) {
      failures.push(formatViolation(story, violation));
    }

    await context.close();
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

await fs.writeFile(
  path.join(artifactDir, "storybook-a11y-summary.json"),
  `${JSON.stringify(summary, null, 2)}\n`
);

if (failures.length > 0) {
  throw new Error(`Storybook a11y gate failed:\n${failures.join("\n\n")}`);
}

console.log(`Validated ${stories.length} Storybook stories with axe critical/serious gate.`);

function formatViolation(story, violation) {
  const nodes = violation.nodes
    .slice(0, 3)
    .map((node) => `  - ${node.target.join(" ")}: ${node.failureSummary ?? violation.help}`)
    .join("\n");
  return `${story.name} (${story.id}) ${violation.impact} ${violation.id}: ${violation.help}\n${nodes}`;
}

function contentType(filePath) {
  if (filePath.endsWith(".html")) {
    return "text/html; charset=utf-8";
  }

  if (filePath.endsWith(".js")) {
    return "text/javascript; charset=utf-8";
  }

  if (filePath.endsWith(".css")) {
    return "text/css; charset=utf-8";
  }

  if (filePath.endsWith(".svg")) {
    return "image/svg+xml";
  }

  return "application/octet-stream";
}
