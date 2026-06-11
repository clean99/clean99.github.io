import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const staticDir = path.resolve("storybook-static-test");

const stories = [
  {
    id: "liquid-glass-liquidlens--kube-reference",
    selector: ".lg-lens",
    width: 210,
    height: 120,
    radius: "75px",
    transparent: true
  },
  {
    id: "liquid-glass-liquidsearchbox--kube-reference",
    selector: ".lg-searchbox",
    width: 336,
    height: 45,
    radius: "28px",
    backgroundColor: "rgba(255, 255, 255, 0.05)"
  }
];

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

try {
  for (const story of stories) {
    const page = await browser.newPage({ viewport: { width: 900, height: 520 } });
    const errors = [];
    page.on("console", (message) => {
      if (message.type() === "error") {
        errors.push(message.text());
      }
    });

    await page.goto(
      `http://127.0.0.1:${port}/iframe.html?id=${story.id}&viewMode=story`,
      { waitUntil: "networkidle", timeout: 20_000 }
    );
    const locator = page.locator(story.selector).first();
    await locator.waitFor({ state: "visible", timeout: 10_000 });

    const result = await locator.evaluate((element) => {
      const view = element.ownerDocument.defaultView;
      if (!view) {
        throw new Error("Missing document view");
      }

      const style = view.getComputedStyle(element);
      const rect = element.getBoundingClientRect();

      return {
        backgroundColor: style.backgroundColor,
        borderRadius: style.borderRadius,
        filter: style.backdropFilter || style.webkitBackdropFilter,
        height: Math.round(rect.height),
        mode: element.getAttribute("data-liquid-mode"),
        width: Math.round(rect.width)
      };
    });

    assertEqual(result.mode, "enhanced", `${story.id} mode`);
    assertIncludes(result.filter, "url(", `${story.id} backdrop-filter`);
    assertEqual(result.width, story.width, `${story.id} width`);
    assertEqual(result.height, story.height, `${story.id} height`);
    assertEqual(result.borderRadius, story.radius, `${story.id} radius`);

    if (story.transparent) {
      assertEqual(result.backgroundColor, "rgba(0, 0, 0, 0)", `${story.id} background`);
    }

    if (story.backgroundColor) {
      assertEqual(result.backgroundColor, story.backgroundColor, `${story.id} background`);
    }

    if (errors.length > 0) {
      throw new Error(`${story.id} emitted console errors:\n${errors.slice(0, 5).join("\n")}`);
    }

    await page.close();
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
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

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertIncludes(actual, expected, label) {
  if (!String(actual).includes(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(actual)} to include ${expected}`);
  }
}
