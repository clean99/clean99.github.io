import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { chromium } from "playwright";

/* global OffscreenCanvas, createImageBitmap, document, getComputedStyle */

const staticDir = path.resolve("storybook-static-test");
const artifactDir = path.resolve("../../test-results/kube-reference");
const targetUrl = "https://kube.io/blog/liquid-glass-css-svg/";
const globalMaxDiffRatio = process.env.KUBE_MAX_DIFF_RATIO
  ? Number(process.env.KUBE_MAX_DIFF_RATIO)
  : undefined;

const references = [
  {
    name: "magnifying-glass",
    storyId: "liquid-glass-liquidlens--kube-reference",
    targetId: "magnifying-glass",
    maxDiffRatio: 0.58
  },
  {
    name: "searchbox",
    storyId: "liquid-glass-liquidsearchbox--kube-reference",
    targetId: "searchbox",
    maxDiffRatio: 0.17
  },
  {
    name: "switch",
    storyId: "liquid-glass-liquidswitch--kube-reference",
    targetId: "switch",
    maxDiffRatio: 0.17
  },
  {
    name: "slider",
    storyId: "liquid-glass-liquidslider--kube-reference",
    targetId: "slider",
    maxDiffRatio: 0.17
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
const results = [];

try {
  const referencePage = await browser.newPage({ viewport: { width: 1100, height: 760 } });
  await referencePage.goto(targetUrl, { waitUntil: "networkidle", timeout: 60_000 });

  for (const reference of references) {
    const targetElement = await findTargetDemo(referencePage, reference.targetId);
    const targetPath = path.join(artifactDir, `${reference.name}-target.png`);
    await targetElement.screenshot({ path: targetPath });

    const candidatePage = await browser.newPage({ viewport: { width: 900, height: 560 } });
    await candidatePage.goto(
      `http://127.0.0.1:${port}/iframe.html?id=${reference.storyId}&viewMode=story`,
      { waitUntil: "networkidle", timeout: 20_000 }
    );

    const candidateElement = candidatePage.locator(
      `[data-lg-reference-frame="${reference.name}"]`
    );
    await candidateElement.waitFor({ state: "visible", timeout: 10_000 });

    const candidatePath = path.join(artifactDir, `${reference.name}-candidate.png`);
    await candidateElement.screenshot({ path: candidatePath });

    const diff = await compareImagesInBrowser(browser, targetPath, candidatePath);
    results.push({
      ...reference,
      ...diff,
      maxDiffRatio: globalMaxDiffRatio ?? reference.maxDiffRatio
    });
    await candidatePage.close();
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

const failures = results.filter((result) => result.diffRatio > result.maxDiffRatio);
console.table(
  results.map((result) => ({
    name: result.name,
    width: result.width,
    height: result.height,
    diffRatio: result.diffRatio.toFixed(4),
    maxDiffRatio: result.maxDiffRatio
  }))
);

if (failures.length > 0) {
  throw new Error(
    `Kube reference diff exceeded threshold for: ${failures
      .map((failure) => `${failure.name} (${failure.diffRatio.toFixed(4)})`)
      .join(", ")}`
  );
}

async function findTargetDemo(page, id) {
  await page.locator(`#${id}`).scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);

  const handle = await page.evaluateHandle((sectionId) => {
    const heading = document.getElementById(sectionId);
    if (!heading) {
      throw new Error(`Missing target heading: ${sectionId}`);
    }

    let current = heading.nextElementSibling;
    while (current) {
      const rect = current.getBoundingClientRect();
      const style = getComputedStyle(current);
      const isDemo =
        rect.width >= 650 &&
        rect.width <= 730 &&
        rect.height >= 300 &&
        rect.height <= 500 &&
        style.position === "relative";

      if (isDemo) {
        return current;
      }

      current = current.nextElementSibling;
    }

    throw new Error(`Missing target demo after heading: ${sectionId}`);
  }, id);

  return handle.asElement();
}

async function compareImagesInBrowser(browser, targetPath, candidatePath) {
  const [target, candidate] = await Promise.all([
    fs.readFile(targetPath),
    fs.readFile(candidatePath)
  ]);
  const page = await browser.newPage();
  const result = await page.evaluate(
    async ({ targetBase64, candidateBase64 }) => {
      const targetImage = await loadImage(targetBase64);
      const candidateImage = await loadImage(candidateBase64);
      const width = Math.min(targetImage.width, candidateImage.width);
      const height = Math.min(targetImage.height, candidateImage.height);
      const canvas = new OffscreenCanvas(width, height);
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) {
        throw new Error("Missing canvas context");
      }

      context.drawImage(targetImage, 0, 0, width, height);
      const targetPixels = context.getImageData(0, 0, width, height).data;
      context.clearRect(0, 0, width, height);
      context.drawImage(candidateImage, 0, 0, width, height);
      const candidatePixels = context.getImageData(0, 0, width, height).data;
      let different = 0;
      const threshold = 24;

      for (let index = 0; index < targetPixels.length; index += 4) {
        const delta =
          Math.abs(targetPixels[index] - candidatePixels[index]) +
          Math.abs(targetPixels[index + 1] - candidatePixels[index + 1]) +
          Math.abs(targetPixels[index + 2] - candidatePixels[index + 2]) +
          Math.abs(targetPixels[index + 3] - candidatePixels[index + 3]);
        if (delta > threshold) {
          different += 1;
        }
      }

      return {
        diffRatio: different / (width * height),
        height,
        width
      };

      async function loadImage(base64) {
        const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
        return createImageBitmap(new Blob([bytes], { type: "image/png" }));
      }
    },
    {
      candidateBase64: candidate.toString("base64"),
      targetBase64: target.toString("base64")
    }
  );

  await page.close();
  return result;
}

function contentType(filePath) {
  if (filePath.endsWith(".html")) {
    return "text/html; charset=utf-8";
  }

  if (filePath.endsWith(".js")) {
    return "text/javascript; charset=utf-8";
  }

  if (filePath.endsWith(".css")) {
    return "text/css";
  }

  if (filePath.endsWith(".svg")) {
    return "image/svg+xml";
  }

  return "application/octet-stream";
}
