import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { chromium } from "playwright";

/* global OffscreenCanvas, createImageBitmap, document, getComputedStyle */

process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY = "1";

const staticDir = path.resolve(process.env.STORYBOOK_STATIC_DIR ?? "storybook-static-test");
const artifactDir = path.resolve("test-results/kube-reference");
const targetUrl = "https://kube.io/blog/liquid-glass-css-svg/";
const targetNavigationRetries = Number(process.env.KUBE_NAVIGATION_RETRIES ?? 3);
const targetNavigationTimeoutMs = Number(process.env.KUBE_NAVIGATION_TIMEOUT_MS ?? 60_000);
const globalMaxDiffRatio = process.env.KUBE_MAX_DIFF_RATIO
  ? Number(process.env.KUBE_MAX_DIFF_RATIO)
  : undefined;
const strictInteractivePixels = process.env.KUBE_STRICT_INTERACTIVE === "1";

const references = [
  {
    name: "magnifying-glass",
    storyId: "liquid-glass-liquidlens--kube-reference",
    targetId: "magnifying-glass",
    compareRegion: { x: 14, y: 26, width: 216, height: 128 },
    maxDiffRatio: 0.3
  },
  {
    name: "magnifying-glass-pressed",
    storyId: "liquid-glass-liquidlens--draggable-precision-lens",
    targetId: "magnifying-glass",
    candidateFrame: "magnifying-glass-interactive",
    action: {
      kind: "press",
      point: { x: 0.42, y: 0.54 },
      pressMs: 220
    },
    capture: "handle",
    metricTolerances: {
      deltaX: 4,
      deltaY: 4,
      heightDelta: 4,
      widthDelta: 4
    },
    maxDiffRatio: 0.42,
    reportOnly: false
  },
  {
    name: "magnifying-glass-dragged",
    storyId: "liquid-glass-liquidlens--draggable-precision-lens",
    targetId: "magnifying-glass",
    candidateFrame: "magnifying-glass-interactive",
    action: {
      delta: { x: 132, y: 76 },
      kind: "drag",
      point: { x: 0.42, y: 0.54 },
      pressMs: 180,
      settleMs: 160
    },
    capture: "handle",
    metricTolerances: {
      deltaX: 8,
      deltaY: 8,
      heightDelta: 4,
      widthDelta: 4
    },
    maxDiffRatio: 0.45,
    reportOnly: false
  },
  {
    name: "searchbox",
    storyId: "liquid-glass-liquidsearchbox--kube-reference",
    targetId: "searchbox",
    maxDiffRatio: 0.03
  },
  {
    name: "switch",
    storyId: "liquid-glass-liquidswitch--kube-reference",
    targetId: "switch",
    maxDiffRatio: 0.03
  },
  {
    name: "slider",
    storyId: "liquid-glass-liquidslider--kube-reference",
    targetId: "slider",
    maxDiffRatio: 0.03
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
  await gotoTargetReference(referencePage);
  await referencePage.waitForLoadState("load", { timeout: 20_000 }).catch(() => undefined);

  for (const reference of references) {
    await referencePage.mouse.move(0, 0).catch(() => undefined);
    const targetElement = await findTargetDemo(referencePage, reference.targetId);
    const targetPath = path.join(artifactDir, `${reference.name}-target.png`);
    const targetAction = reference.action
      ? await applyTargetAction(referencePage, targetElement, reference.action)
      : null;
    const targetScreenshotSubject =
      reference.capture === "handle" ? (targetAction?.subject ?? targetElement) : targetElement;
    await targetScreenshotSubject.screenshot({ path: targetPath });
    await targetAction?.cleanup();

    const candidatePage = await browser.newPage({ viewport: { width: 900, height: 560 } });
    await candidatePage.goto(
      `http://127.0.0.1:${port}/iframe.html?id=${reference.storyId}&viewMode=story`,
      { waitUntil: "networkidle", timeout: 20_000 }
    );
    await candidatePage.mouse.move(0, 0).catch(() => undefined);

    const candidateElement = candidatePage.locator(
      `[data-lg-reference-frame="${reference.candidateFrame ?? reference.name}"]`
    );
    await candidateElement.waitFor({ state: "visible", timeout: 10_000 });
    if (reference.targetId === "magnifying-glass") {
      await waitForFilterContract(candidateElement, 2);
    }

    const candidatePath = path.join(artifactDir, `${reference.name}-candidate.png`);
    const candidateAction = reference.action
      ? await applyCandidateAction(candidatePage, candidateElement, reference.action)
      : null;
    const candidateScreenshotSubject =
      reference.capture === "handle"
        ? (candidateAction?.subject ?? candidateElement)
        : candidateElement;
    await candidateScreenshotSubject.screenshot({ path: candidatePath });
    await candidateAction?.cleanup();

    if (reference.targetId === "magnifying-glass") {
      const [targetContract, candidateContract] = await Promise.all([
        readFilterContract(targetElement, "kube"),
        readFilterContract(candidateElement, "local")
      ]);
      const filterSummary = summarizeFilterContract(targetContract, candidateContract);
      await fs.writeFile(
        path.join(artifactDir, `${reference.name}-filter-contract.json`),
        `${JSON.stringify(
          {
            summary: filterSummary,
            target: targetContract,
            candidate: candidateContract
          },
          null,
          2
        )}\n`
      );
      assertFilterContractParity(reference, filterSummary);
    }

    const diff = await compareImagesInBrowser(
      browser,
      targetPath,
      candidatePath,
      reference.compareRegion
    );
    assertActionMetricParity(reference, targetAction?.metrics, candidateAction?.metrics);
    const reportOnly = Boolean(reference.reportOnly) && !strictInteractivePixels;

    results.push({
      ...reference,
      ...diff,
      candidateActionMetrics: candidateAction?.metrics,
      maxDiffRatio: globalMaxDiffRatio ?? reference.maxDiffRatio,
      reportOnly,
      strictInteractivePixels,
      targetActionMetrics: targetAction?.metrics
    });
    await candidatePage.close();
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

await fs.writeFile(
  path.join(artifactDir, "kube-reference-results.json"),
  `${JSON.stringify(results, null, 2)}\n`
);

const failures = results.filter(
  (result) => !result.reportOnly && result.diffRatio > result.maxDiffRatio
);
console.table(
  results.map((result) => ({
    name: result.name,
    width: result.width,
    height: result.height,
    diffRatio: result.diffRatio.toFixed(4),
    meanDelta: result.meanDelta.toFixed(2),
    rmsDelta: result.rmsDelta.toFixed(2),
    maxDiffRatio: result.maxDiffRatio,
    mode: result.reportOnly ? "report" : "gate"
  }))
);

if (failures.length > 0) {
  throw new Error(
    `Kube reference diff exceeded threshold for: ${failures
      .map((failure) => `${failure.name} (${failure.diffRatio.toFixed(4)})`)
      .join(", ")}`
  );
}

async function gotoTargetReference(page) {
  let lastError;

  for (let attempt = 1; attempt <= targetNavigationRetries; attempt += 1) {
    try {
      await page.goto(targetUrl, {
        timeout: targetNavigationTimeoutMs,
        waitUntil: "domcontentloaded"
      });
      return;
    } catch (error) {
      lastError = error;

      if (attempt >= targetNavigationRetries) {
        break;
      }

      console.warn(
        `Kube reference navigation failed on attempt ${attempt}; retrying before visual comparison.`
      );
      await page.waitForTimeout(1_000 * attempt);
    }
  }

  throw lastError;
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

async function waitForFilterContract(locator, minDisplacementMaps) {
  const deadline = Date.now() + 5_000;
  let lastCount = 0;

  while (Date.now() < deadline) {
    lastCount = await locator.evaluate((root) => {
      const surface = findFilterSurface(root);
      const value = surface
        ? getComputedStyle(surface).backdropFilter || getComputedStyle(surface).webkitBackdropFilter
        : "";
      const filterId = extractFilterId(value);
      const filter = filterId ? document.getElementById(filterId) : null;

      return filter?.querySelectorAll("feDisplacementMap").length ?? 0;

      function findFilterSurface(base) {
        const candidates = [base, ...base.querySelectorAll("*")];
        return (
          candidates.find((candidate) => {
            const style = getComputedStyle(candidate);
            const filterValue = style.backdropFilter || style.webkitBackdropFilter;
            return filterValue && filterValue !== "none" && filterValue.includes("url(");
          }) ?? null
        );
      }

      function extractFilterId(value) {
        const match = value?.match(/url\((?:"|')?#?([^"')]+)(?:"|')?\)/);
        return match?.[1] ?? null;
      }
    });

    if (lastCount >= minDisplacementMaps) {
      return;
    }

    await delay(100);
  }

  throw new Error(
    `Timed out waiting for two-pass lens filter: expected at least ${minDisplacementMaps} feDisplacementMap nodes, got ${lastCount}`
  );
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function applyTargetAction(page, targetElement, action) {
  const handle = await findTargetDragHandle(targetElement);

  return applyPointerAction(page, handle, action);
}

async function applyCandidateAction(page, candidateElement, action) {
  const handle = candidateElement.locator("[data-lg-draggable-lens]").first();
  await handle.waitFor({ state: "visible", timeout: 10_000 });

  return applyPointerAction(page, handle, action);
}

async function findTargetDragHandle(root) {
  const handle = await root.evaluateHandle((base) => {
    const candidates = [base, ...base.querySelectorAll("*")];

    return (
      candidates.find((candidate) => {
        const rect = candidate.getBoundingClientRect();
        const style = getComputedStyle(candidate);

        return (
          rect.width >= 180 &&
          rect.height >= 90 &&
          style.cursor.includes("grab") &&
          style.pointerEvents !== "none"
        );
      }) ?? null
    );
  });
  const element = handle.asElement();

  if (!element) {
    throw new Error("Missing draggable lens handle in Kube reference demo");
  }

  return element;
}

async function applyPointerAction(page, handle, action) {
  const box = await handle.boundingBox();

  if (!box) {
    throw new Error(`Missing bounding box for ${action.kind} action`);
  }

  const startX = box.x + box.width * action.point.x;
  const startY = box.y + box.height * action.point.y;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.waitForTimeout(action.pressMs ?? 180);

  if (action.kind === "drag") {
    await page.mouse.move(startX + action.delta.x, startY + action.delta.y, { steps: 8 });
    await page.waitForTimeout(action.settleMs ?? 120);
  }

  const after = await waitForPointerActionEffect(handle, box, action);
  const metrics = summarizeActionMetrics(box, after, action);
  assertPointerActionMetrics(metrics, action);

  return {
    cleanup: async () => {
      await page.mouse.up().catch(() => undefined);
      await page.mouse.move(0, 0).catch(() => undefined);
      await page.waitForTimeout(160);
    },
    metrics,
    subject: handle
  };
}

async function waitForPointerActionEffect(handle, before, action) {
  const deadline = Date.now() + (action.effectTimeoutMs ?? 1_000);
  let lastBox = await handle.boundingBox();

  while (Date.now() < deadline) {
    const metrics = summarizeActionMetrics(before, lastBox, action);

    if (hasPointerActionEffect(metrics, action)) {
      return lastBox;
    }

    await delay(50);
    lastBox = await handle.boundingBox();
  }

  return lastBox;
}

function summarizeActionMetrics(before, after, action) {
  if (!after) {
    throw new Error(`Missing post-action bounding box for ${action.kind} action`);
  }

  return {
    deltaX: round(after.x - before.x),
    deltaY: round(after.y - before.y),
    height: round(after.height),
    heightDelta: round(after.height - before.height),
    kind: action.kind,
    width: round(after.width),
    widthDelta: round(after.width - before.width)
  };
}

function hasPointerActionEffect(metrics, action) {
  if (action.kind === "press") {
    const changedSize = Math.abs(metrics.widthDelta) + Math.abs(metrics.heightDelta);

    return changedSize >= 10;
  }

  return (
    Math.abs(metrics.deltaX) >= Math.abs(action.delta.x) * 0.45 &&
    Math.abs(metrics.deltaY) >= Math.abs(action.delta.y) * 0.45
  );
}

function assertPointerActionMetrics(metrics, action) {
  if (action.kind === "press") {
    if (!hasPointerActionEffect(metrics, action)) {
      throw new Error(`Press action did not deform the lens enough: ${JSON.stringify(metrics)}`);
    }
    return;
  }

  if (!hasPointerActionEffect(metrics, action)) {
    const minX = Math.abs(action.delta.x) * 0.45;
    const minY = Math.abs(action.delta.y) * 0.45;
    throw new Error(
      `Drag action did not move the lens enough: expected at least ${round(minX)}px x and ${round(
        minY
      )}px y, got ${JSON.stringify(metrics)}`
    );
  }
}

function assertActionMetricParity(reference, targetMetrics, candidateMetrics) {
  const tolerances = reference.metricTolerances;
  if (!tolerances) {
    return;
  }

  if (!targetMetrics || !candidateMetrics) {
    throw new Error(`Missing action metrics for ${reference.name}`);
  }

  const failures = Object.entries(tolerances)
    .map(([metricName, tolerance]) => {
      const targetValue = targetMetrics[metricName];
      const candidateValue = candidateMetrics[metricName];

      if (!Number.isFinite(targetValue) || !Number.isFinite(candidateValue)) {
        return `${metricName}: target=${targetValue}, candidate=${candidateValue}`;
      }

      const delta = Math.abs(candidateValue - targetValue);
      return delta > tolerance
        ? `${metricName}: target=${targetValue}, candidate=${candidateValue}, delta=${round(delta)}, tolerance=${tolerance}`
        : null;
    })
    .filter(Boolean);

  if (failures.length > 0) {
    throw new Error(`Kube action metrics diverged for ${reference.name}: ${failures.join("; ")}`);
  }
}

async function readFilterContract(element, label) {
  return element.evaluate((root, contractLabel) => {
    const rootRect = toRect(root.getBoundingClientRect());
    const surface = findFilterSurface(root);
    const surfaceStyle = getComputedStyle(surface);
    const backdropFilter = surfaceStyle.backdropFilter || surfaceStyle.webkitBackdropFilter;
    const filterId = extractFilterId(backdropFilter);
    const filter = filterId ? document.getElementById(filterId) : null;
    const primitives = filter
      ? Array.from(filter.querySelectorAll("*")).map((node) => ({
          attributes: Object.fromEntries(
            node
              .getAttributeNames()
              .map((name) => [name, truncateAttribute(node.getAttribute(name) ?? "")])
          ),
          tag: node.tagName
        }))
      : [];

    return {
      label: contractLabel,
      rootRect,
      surfaceRect: toRect(surface.getBoundingClientRect()),
      computed: {
        backdropFilter,
        backgroundColor: surfaceStyle.backgroundColor,
        borderRadius: surfaceStyle.borderRadius,
        boxShadow: surfaceStyle.boxShadow,
        webkitBackdropFilter: surfaceStyle.webkitBackdropFilter
      },
      counts: countPrimitives(primitives),
      displacementScales: primitives
        .filter((primitive) => primitive.tag === "feDisplacementMap")
        .map((primitive) => Number(primitive.attributes.scale ?? 0)),
      filterId,
      imageSources: primitives
        .filter((primitive) => primitive.tag === "feImage")
        .map((primitive) => ({
          height: primitive.attributes.height,
          href: primitive.attributes.href ?? primitive.attributes["xlink:href"],
          result: primitive.attributes.result,
          width: primitive.attributes.width
        })),
      primitives
    };

    function findFilterSurface(base) {
      const candidates = [base, ...base.querySelectorAll("*")];
      return (
        candidates.find((candidate) => {
          const style = getComputedStyle(candidate);
          const value = style.backdropFilter || style.webkitBackdropFilter;
          return value && value !== "none" && value.includes("url(");
        }) ?? base
      );
    }

    function countPrimitives(primitivesToCount) {
      return primitivesToCount.reduce((counts, primitive) => {
        counts[primitive.tag] = (counts[primitive.tag] ?? 0) + 1;
        return counts;
      }, {});
    }

    function extractFilterId(value) {
      const match = value?.match(/url\((?:"|')?#?([^"')]+)(?:"|')?\)/);
      return match?.[1] ?? null;
    }

    function toRect(rect) {
      return {
        height: round(rect.height),
        width: round(rect.width),
        x: round(rect.x),
        y: round(rect.y)
      };
    }

    function round(value) {
      return Math.round(value * 100) / 100;
    }

    function truncateAttribute(value) {
      if (value.startsWith("data:") && value.length > 96) {
        return `${value.slice(0, 96)}...`;
      }

      if (value.length > 180) {
        return `${value.slice(0, 180)}...`;
      }

      return value;
    }
  }, label);
}

function summarizeFilterContract(target, candidate) {
  return {
    candidateDisplacementMapCount: candidate.counts.feDisplacementMap ?? 0,
    candidateDisplacementScales: candidate.displacementScales,
    candidateFilterId: candidate.filterId,
    candidateImageCount: candidate.counts.feImage ?? 0,
    candidateLooksOnePass: (candidate.counts.feDisplacementMap ?? 0) === 1,
    candidateLooksTwoPass: (candidate.counts.feDisplacementMap ?? 0) >= 2,
    targetDisplacementMapCount: target.counts.feDisplacementMap ?? 0,
    targetDisplacementScales: target.displacementScales,
    targetFilterId: target.filterId,
    targetImageCount: target.counts.feImage ?? 0,
    targetLooksTwoPass: (target.counts.feDisplacementMap ?? 0) >= 2
  };
}

function assertFilterContractParity(reference, summary) {
  if (reference.targetId !== "magnifying-glass") {
    return;
  }

  if (summary.targetLooksTwoPass && !summary.candidateLooksTwoPass) {
    throw new Error(
      `Kube filter contract mismatch for ${reference.name}: target is two-pass but candidate is not (${JSON.stringify(summary)})`
    );
  }

  if (summary.candidateDisplacementMapCount !== summary.targetDisplacementMapCount) {
    throw new Error(
      `Kube displacement map count mismatch for ${reference.name}: target=${summary.targetDisplacementMapCount}, candidate=${summary.candidateDisplacementMapCount} (${JSON.stringify(summary)})`
    );
  }

  if (summary.candidateImageCount !== summary.targetImageCount) {
    throw new Error(
      `Kube filter image count mismatch for ${reference.name}: target=${summary.targetImageCount}, candidate=${summary.candidateImageCount} (${JSON.stringify(summary)})`
    );
  }

  if (summary.candidateDisplacementScales.length !== summary.targetDisplacementScales.length) {
    throw new Error(
      `Kube displacement scale count mismatch for ${reference.name}: target=${summary.targetDisplacementScales.length}, candidate=${summary.candidateDisplacementScales.length} (${JSON.stringify(summary)})`
    );
  }

  const scaleFailures = summary.targetDisplacementScales
    .map((targetScale, index) => {
      const candidateScale = summary.candidateDisplacementScales[index];
      const delta = Math.abs(candidateScale - targetScale);

      return delta > 1
        ? `scale[${index}]: target=${round(targetScale)}, candidate=${round(candidateScale)}, delta=${round(delta)}`
        : null;
    })
    .filter(Boolean);

  if (scaleFailures.length > 0) {
    throw new Error(
      `Kube displacement scales diverged for ${reference.name}: ${scaleFailures.join("; ")}`
    );
  }
}

async function compareImagesInBrowser(browser, targetPath, candidatePath, compareRegion) {
  const [target, candidate] = await Promise.all([
    fs.readFile(targetPath),
    fs.readFile(candidatePath)
  ]);
  const page = await browser.newPage();
  const result = await page.evaluate(
    async ({ targetBase64, candidateBase64, region }) => {
      const targetImage = await loadImage(targetBase64);
      const candidateImage = await loadImage(candidateBase64);
      const source = region ?? {
        x: 0,
        y: 0,
        width: Math.min(targetImage.width, candidateImage.width),
        height: Math.min(targetImage.height, candidateImage.height)
      };
      const width = Math.min(
        source.width,
        targetImage.width - source.x,
        candidateImage.width - source.x
      );
      const height = Math.min(
        source.height,
        targetImage.height - source.y,
        candidateImage.height - source.y
      );
      const canvas = new OffscreenCanvas(width, height);
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) {
        throw new Error("Missing canvas context");
      }

      context.drawImage(targetImage, source.x, source.y, width, height, 0, 0, width, height);
      const targetPixels = context.getImageData(0, 0, width, height).data;
      context.clearRect(0, 0, width, height);
      context.drawImage(candidateImage, source.x, source.y, width, height, 0, 0, width, height);
      const candidatePixels = context.getImageData(0, 0, width, height).data;
      let different = 0;
      let totalDelta = 0;
      let totalSquaredDelta = 0;
      const threshold = 24;

      for (let index = 0; index < targetPixels.length; index += 4) {
        const delta =
          Math.abs(targetPixels[index] - candidatePixels[index]) +
          Math.abs(targetPixels[index + 1] - candidatePixels[index + 1]) +
          Math.abs(targetPixels[index + 2] - candidatePixels[index + 2]) +
          Math.abs(targetPixels[index + 3] - candidatePixels[index + 3]);
        totalDelta += delta;
        totalSquaredDelta += delta * delta;
        if (delta > threshold) {
          different += 1;
        }
      }

      const pixelCount = width * height;
      return {
        diffRatio: different / pixelCount,
        height,
        meanDelta: totalDelta / pixelCount,
        rmsDelta: Math.sqrt(totalSquaredDelta / pixelCount),
        width
      };

      async function loadImage(base64) {
        const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
        return createImageBitmap(new Blob([bytes], { type: "image/png" }));
      }
    },
    {
      candidateBase64: candidate.toString("base64"),
      region: compareRegion,
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

function round(value) {
  return Math.round(value * 100) / 100;
}
