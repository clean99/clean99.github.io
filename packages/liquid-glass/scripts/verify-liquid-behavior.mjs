/* global document, getComputedStyle, requestAnimationFrame */

import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { chromium } from "playwright";

const staticDir = path.resolve(process.env.STORYBOOK_STATIC_DIR ?? "storybook-static-test");
const behaviorArtifactDir = path.resolve("test-results/liquid-behavior");

await fs.mkdir(behaviorArtifactDir, { recursive: true });

const behaviorStories = {
  button: {
    id: "liquid-glass-liquidbutton--focus-visible",
    selector: ".lg-surface--button"
  },
  field: {
    id: "liquid-glass-liquidfield--light-mode",
    focusSelector: ".lg-input",
    selector: ".lg-field-control"
  },
  tabs: {
    id: "liquid-glass-liquidtabs--focus-visible",
    selector: ".lg-tabs__tab"
  },
  searchbox: {
    id: "liquid-glass-liquidsearchbox--focus-photo-reference",
    focusSelector: ".lg-searchbox__input",
    selector: ".lg-searchbox"
  },
  draggableLens: {
    id: "liquid-glass-liquidlens--draggable-precision-lens",
    selector: "[data-lg-draggable-lens]"
  }
};

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
  await verifyFocusMaterial("tabs", {
    minimumFocusedScale: 1.04,
    requireMaterialDeepening: true,
    requireTextShadow: true
  });
  await verifyFocusMaterial("searchbox", {
    focusSelector: behaviorStories.searchbox.focusSelector,
    minimumFocusGrowthRatio: 1.2,
    minimumFocusedScale: 0.999,
    requireMaterialDeepening: true
  });
  await verifyFocusMaterial("field", {
    minimumFocusedScale: 1.012,
    focusSelector: behaviorStories.field.focusSelector,
    requireMaterialDeepening: true
  });
  await verifyFocusMaterial("button", {
    minimumFocusedScale: 1.018,
    requireMaterialDeepening: true
  });
  await verifyHoverAndActiveResponse();
  await verifyDraggableLensPlayground();
  await verifyReducedMotionRemovesElasticFocus();
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

async function verifyFocusMaterial(name, options) {
  const story = behaviorStories[name];
  const page = await openStory(story.id);
  const locator = page.locator(story.selector).first();
  await locator.waitFor({ state: "visible", timeout: 10_000 });
  const idle = await readState(locator);

  const focusSelector = options.focusSelector ?? story.selector;
  if (options.focusSelector) {
    await page.locator(focusSelector).first().focus();
  } else {
    await keyboardFocusVisible(page, focusSelector);
  }
  await page.waitForTimeout(240);
  const focused = await readState(locator);

  assertEqual(focused.outlineStyle, "none", `${name} focus outline style`);
  assertNoPlasticFocusChrome(focused, `${name} focus`);
  if (options.requireMaterialDeepening) {
    assertGreaterThan(
      focused.backgroundAlpha,
      idle.backgroundAlpha + 0.04,
      `${name} focus material alpha`
    );
  }
  if (options.minimumFocusedScale !== undefined) {
    assertGreaterOrEqual(focused.scale, options.minimumFocusedScale, `${name} focus scale`);
  }
  assertGreaterThan(focused.shadowLayerCount, idle.shadowLayerCount, `${name} focus shadow layers`);
  assertIncludes(focused.transitionProperty, "transform", `${name} focus transition property`);
  assertGreaterThan(focused.maxTransitionDurationMs, 0, `${name} focus transition duration`);
  if (options.minimumFocusGrowthRatio !== undefined) {
    assertGreaterOrEqual(
      focused.width / idle.width,
      options.minimumFocusGrowthRatio,
      `${name} focus visual width ratio`
    );
  } else {
    assertGreaterThan(focused.width, idle.width, `${name} focus visual width`);
  }

  if (options.requireTextShadow) {
    assertNotEqual(focused.textShadow, "none", `${name} focused foreground text shadow`);
  }

  await page.close();
}

async function verifyHoverAndActiveResponse() {
  const page = await openStory(behaviorStories.tabs.id);
  const locator = page.locator(".lg-tabs__tab").nth(1);
  await locator.waitFor({ state: "visible", timeout: 10_000 });
  const idle = await readState(locator);

  await locator.hover();
  await page.waitForTimeout(120);
  const hovered = await readState(locator);
  assertGreaterThan(hovered.backgroundAlpha, idle.backgroundAlpha, "tabs hover material alpha");

  const box = await locator.boundingBox();
  if (!box) {
    throw new Error("tabs active target is missing a bounding box");
  }

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(240);
  const active = await readState(locator);
  assertLessThanOrEqual(active.scale, hovered.scale, "tabs active scale relaxes");
  await page.mouse.up();

  await page.close();
}

async function verifyDraggableLensPlayground() {
  const page = await openStory(behaviorStories.draggableLens.id, {}, { width: 900, height: 680 });
  const locator = page.locator(behaviorStories.draggableLens.selector).first();
  const boardLocator = page.locator("[data-lg-lens-board]").first();
  let framesPromise;

  try {
    await boardLocator.waitFor({ state: "visible", timeout: 10_000 });
    await locator.waitFor({ state: "visible", timeout: 10_000 });
    await boardLocator.screenshot({
      path: path.join(behaviorArtifactDir, "draggable-lens-board-idle.png")
    });
    await locator.screenshot({
      path: path.join(behaviorArtifactDir, "draggable-lens-idle.png")
    });
    const idle = await readDraggableLensState(locator);
    const box = await locator.boundingBox();

    if (!box) {
      throw new Error("draggable lens target is missing a bounding box");
    }

    await page.mouse.move(box.x + box.width * 0.42, box.y + box.height * 0.54);
    framesPromise = recordAnimationFrames(page, behaviorStories.draggableLens.selector, 1_400);
    await page.mouse.down();
    await page.waitForTimeout(180);
    await boardLocator.screenshot({
      path: path.join(behaviorArtifactDir, "draggable-lens-board-pressed.png")
    });
    await locator.screenshot({
      path: path.join(behaviorArtifactDir, "draggable-lens-pressed.png")
    });
    const pressed = await readDraggableLensState(locator);

    assertEqual(pressed.dropletState, "pressed", "draggable lens pressed state");
    assertGreaterThan(pressed.scaleX, 1.04, "draggable lens water-drop scaleX");
    assertGreaterThan(pressed.scaleY, idle.scaleY + 0.12, "draggable lens water-drop scaleY");
    assertLessThan(pressed.scaleY, 1, "draggable lens pressed scaleY stays optically flattened");
    assertIncludes(pressed.dropletOriginX, "%", "draggable lens droplet origin x");
    assertIncludes(pressed.dropletOriginY, "%", "draggable lens droplet origin y");

    await page.mouse.move(box.x + box.width * 0.42 + 132, box.y + box.height * 0.54 + 76, {
      steps: 8
    });
    await page.waitForTimeout(80);
    await boardLocator.screenshot({
      path: path.join(behaviorArtifactDir, "draggable-lens-board-dragged.png")
    });
    await locator.screenshot({
      path: path.join(behaviorArtifactDir, "draggable-lens-dragged.png")
    });
    const dragged = await readDraggableLensState(locator);

    assertEqual(dragged.draggingState, "true", "draggable lens dragging state");
    assertGreaterThan(dragged.lensX, idle.lensX + 100, "draggable lens x movement");
    assertGreaterThan(dragged.lensY, idle.lensY + 56, "draggable lens y movement");
    assertGreaterThan(dragged.left, idle.left + 80, "draggable lens visual x movement");
    assertGreaterThan(dragged.top, idle.top + 40, "draggable lens visual y movement");
    assertLessThanOrEqual(dragged.scaleX, pressed.scaleX - 0.025, "dragged lens narrows vs press");
    assertGreaterThan(dragged.scaleY, pressed.scaleY + 0.005, "dragged lens grows taller vs press");

    await page.mouse.up();
    await page.waitForTimeout(320);
    await boardLocator.screenshot({
      path: path.join(behaviorArtifactDir, "draggable-lens-board-released.png")
    });
    await locator.screenshot({
      path: path.join(behaviorArtifactDir, "draggable-lens-released.png")
    });
    const frames = await framesPromise;
    framesPromise = undefined;
    const frameSummary = summarizeDraggableLensFrames(frames);
    await fs.writeFile(
      path.join(behaviorArtifactDir, "draggable-lens-frames.json"),
      `${JSON.stringify({ frames, summary: frameSummary }, null, 2)}\n`
    );

    assertGreaterOrEqual(frameSummary.frameCount, 12, "draggable lens animation frame count");
    assertGreaterThan(frameSummary.pressedFrameCount, 2, "draggable lens real pressed frames");
    assertGreaterThan(frameSummary.draggingFrameCount, 2, "draggable lens real dragging frames");
    assertGreaterThan(frameSummary.releasedFrameCount, 2, "draggable lens real release frames");
    assertGreaterThan(frameSummary.scaleXRange, 0.035, "draggable lens animated scaleX range");
    assertGreaterThan(frameSummary.scaleYRange, 0.025, "draggable lens animated scaleY range");
    assertGreaterThan(frameSummary.leftRange, 80, "draggable lens animated x travel");
    assertGreaterThan(frameSummary.topRange, 40, "draggable lens animated y travel");
    assertGreaterThan(frameSummary.transformVariantCount, 3, "draggable lens transform variants");
    assertApproxEqual(frameSummary.finalScaleX, 1, 0.012, "draggable lens final frame scaleX");
    assertApproxEqual(frameSummary.finalScaleY, 0.8, 0.012, "draggable lens final frame scaleY");

    const released = await readDraggableLensState(locator);
    assertEqual(released.dropletState, "idle", "draggable lens released state");
    assertApproxEqual(released.scaleX, 1, 0.01, "draggable lens released scaleX");
    assertApproxEqual(released.scaleY, 0.8, 0.01, "draggable lens released scaleY");
  } finally {
    await framesPromise?.catch(() => []);
    await page.close();
  }
}

async function recordAnimationFrames(page, selector, durationMs) {
  return page.evaluate(
    ({ frameSelector, recordDurationMs }) =>
      new Promise((resolve) => {
        const startedAt = performance.now();
        const frames = [];

        const sample = () => {
          const element = document.querySelector(frameSelector);
          if (!element) {
            resolve(frames);
            return;
          }

          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          const scale = matrixScaleAxes(style.transform);
          frames.push({
            draggingState: element.getAttribute("data-liquid-dragging") ?? "false",
            dropletState: element.getAttribute("data-liquid-droplet") ?? "idle",
            left: round(rect.left),
            scaleX: round(scale.scaleX),
            scaleY: round(scale.scaleY),
            time: round(performance.now() - startedAt),
            top: round(rect.top),
            transform: style.transform
          });

          if (performance.now() - startedAt >= recordDurationMs) {
            resolve(frames);
            return;
          }

          requestAnimationFrame(sample);
        };

        requestAnimationFrame(sample);

        function matrixScaleAxes(transform) {
          if (transform === "none") {
            return { scaleX: 1, scaleY: 1 };
          }

          const matrix = transform
            .match(/matrix\(([^)]+)\)/)?.[1]
            ?.split(/,\s*/)
            .map(Number);
          if (!matrix || matrix.length < 4) {
            return { scaleX: 1, scaleY: 1 };
          }

          return {
            scaleX: Math.sqrt(matrix[0] * matrix[0] + matrix[1] * matrix[1]),
            scaleY: Math.sqrt(matrix[2] * matrix[2] + matrix[3] * matrix[3])
          };
        }

        function round(value) {
          return Math.round(value * 1000) / 1000;
        }
      }),
    { frameSelector: selector, recordDurationMs: durationMs }
  );
}

function summarizeDraggableLensFrames(frames) {
  const scaleXs = frames.map((frame) => frame.scaleX);
  const scaleYs = frames.map((frame) => frame.scaleY);
  const lefts = frames.map((frame) => frame.left);
  const tops = frames.map((frame) => frame.top);
  const transforms = new Set(frames.map((frame) => frame.transform));

  return {
    draggingFrameCount: frames.filter((frame) => frame.draggingState === "true").length,
    finalScaleX: frames.at(-1)?.scaleX ?? 1,
    finalScaleY: frames.at(-1)?.scaleY ?? 1,
    frameCount: frames.length,
    leftRange: range(lefts),
    pressedFrameCount: frames.filter((frame) => frame.dropletState === "pressed").length,
    releasedFrameCount: frames.filter((frame) => frame.dropletState === "idle").length,
    scaleXRange: range(scaleXs),
    scaleYRange: range(scaleYs),
    topRange: range(tops),
    transformVariantCount: transforms.size
  };
}

function range(values) {
  if (values.length === 0) {
    return 0;
  }

  return Math.max(...values) - Math.min(...values);
}

async function verifyReducedMotionRemovesElasticFocus() {
  const story = behaviorStories.tabs;
  const page = await openStory(story.id, { reducedMotion: "reduce" });
  const locator = page.locator(story.selector).first();
  await locator.waitFor({ state: "visible", timeout: 10_000 });
  await keyboardFocusVisible(page, story.selector);
  await page.waitForTimeout(120);
  const focused = await readState(locator);

  assertApproxEqual(focused.scale, 1, 0.001, "reduced motion focus scale");
  await page.close();
}

async function keyboardFocusVisible(page, selector) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    await page.keyboard.press("Tab");
    const isFocused = await page
      .locator(selector)
      .first()
      .evaluate((element) => {
        return element === element.ownerDocument.activeElement && element.matches(":focus-visible");
      });

    if (isFocused) {
      return;
    }
  }

  throw new Error(`${selector}: unable to reach focus-visible through keyboard navigation`);
}

async function openStory(id, media = {}, viewport = { width: 900, height: 520 }) {
  const page = await browser.newPage({ viewport });
  await page.emulateMedia(media);
  await page.goto(`http://127.0.0.1:${port}/iframe.html?id=${id}&viewMode=story`, {
    waitUntil: "networkidle",
    timeout: 20_000
  });
  return page;
}

async function readDraggableLensState(locator) {
  return locator.evaluate((element) => {
    const view = element.ownerDocument.defaultView;
    if (!view) {
      throw new Error("Missing document view");
    }

    const rect = element.getBoundingClientRect();
    const style = view.getComputedStyle(element);
    const scale = matrixScaleAxes(style.transform);

    return {
      draggingState: element.getAttribute("data-liquid-dragging"),
      dropletState: element.getAttribute("data-liquid-droplet"),
      dropletOriginX: style.getPropertyValue("--lg-demo-droplet-origin-x"),
      dropletOriginY: style.getPropertyValue("--lg-demo-droplet-origin-y"),
      lensX: Number(element.getAttribute("data-lens-x") ?? 0),
      lensY: Number(element.getAttribute("data-lens-y") ?? 0),
      left: rect.left,
      scaleX: scale.scaleX,
      scaleY: scale.scaleY,
      top: rect.top,
      transform: style.transform,
      transformOrigin: style.transformOrigin
    };

    function matrixScaleAxes(transform) {
      if (transform === "none") {
        return { scaleX: 1, scaleY: 1 };
      }

      const matrix = transform
        .match(/matrix\(([^)]+)\)/)?.[1]
        ?.split(/,\s*/)
        .map(Number);
      if (!matrix || matrix.length < 4) {
        return { scaleX: 1, scaleY: 1 };
      }

      return {
        scaleX: Math.sqrt(matrix[0] * matrix[0] + matrix[1] * matrix[1]),
        scaleY: Math.sqrt(matrix[2] * matrix[2] + matrix[3] * matrix[3])
      };
    }
  });
}

async function readState(locator) {
  return locator.evaluate((element) => {
    const view = element.ownerDocument.defaultView;
    if (!view) {
      throw new Error("Missing document view");
    }

    const style = view.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const scale = matrixScale(style.transform);

    return {
      backgroundAlpha: alphaOf(style.backgroundColor),
      borderAlpha: alphaOf(style.borderColor),
      borderLuma: lumaOf(style.borderColor),
      borderColor: style.borderColor,
      boxShadow: style.boxShadow,
      hardRingLayerCount: countCheapHardRingLayers(style.boxShadow),
      height: rect.height,
      outlineColor: style.outlineColor,
      outlineStyle: style.outlineStyle,
      scale,
      shadowLayerCount:
        style.boxShadow === "none" ? 0 : style.boxShadow.split(/,(?![^()]*\))/).length,
      textShadow: style.textShadow,
      transitionProperty: style.transitionProperty,
      maxTransitionDurationMs: maxTransitionDurationMs(style.transitionDuration),
      transform: style.transform,
      width: rect.width
    };

    function alphaOf(color) {
      const parsed = parseColor(color);
      return parsed.alpha;
    }

    function lumaOf(color) {
      const parsed = parseColor(color);
      return 0.2126 * parsed.red + 0.7152 * parsed.green + 0.0722 * parsed.blue;
    }

    function countCheapHardRingLayers(boxShadow) {
      if (boxShadow === "none") {
        return 0;
      }

      return boxShadow.split(/,(?![^()]*\))/).filter((layer) => {
        if (layer.includes("inset")) {
          return false;
        }

        if (!/\b0px 0px 0px 1px\b/.test(layer)) {
          return false;
        }

        const color = parseColor(layer);
        const luma = 0.2126 * color.red + 0.7152 * color.green + 0.0722 * color.blue;
        return color.alpha >= 0.3 && (luma <= 20 || luma >= 235);
      }).length;
    }

    function parseColor(color) {
      const srgb = color.match(
        /color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)/
      );
      if (srgb) {
        return {
          alpha: srgb[4] === undefined ? 1 : parseCssNumber(srgb[4]),
          blue: Number(srgb[3]) * 255,
          green: Number(srgb[2]) * 255,
          red: Number(srgb[1]) * 255
        };
      }

      const oklab = color.match(
        /oklab\(\s*([-\d.]+%?)\s+[-\d.]+%?\s+[-\d.]+%?(?:\s*\/\s*([-\d.]+%?))?\)/
      );
      if (oklab) {
        const lightness = parseCssNumber(oklab[1] ?? "0") * 255;
        return {
          alpha: oklab[2] === undefined ? 1 : parseCssNumber(oklab[2]),
          blue: lightness,
          green: lightness,
          red: lightness
        };
      }

      const match = color.match(/rgba?\(([^)]+)\)/);
      if (!match) {
        return { alpha: 1, blue: 0, green: 0, red: 0 };
      }

      const parts = match[1]
        .split(/[,\s/]+/)
        .filter(Boolean)
        .map(Number);

      return {
        alpha: parts.length >= 4 ? parts[3] : 1,
        blue: parts[2] ?? 0,
        green: parts[1] ?? 0,
        red: parts[0] ?? 0
      };
    }

    function parseCssNumber(value) {
      return value.endsWith("%") ? Number(value.slice(0, -1)) / 100 : Number(value);
    }

    function matrixScale(transform) {
      if (transform === "none") {
        return 1;
      }

      const values = transform
        .match(/matrix\(([^)]+)\)/)?.[1]
        ?.split(/,\s*/)
        .map(Number);
      if (!values || values.length < 4) {
        return 1;
      }

      return Math.sqrt(values[0] * values[0] + values[1] * values[1]);
    }

    function maxTransitionDurationMs(durationList) {
      return Math.max(
        ...durationList.split(",").map((duration) => {
          const value = duration.trim();
          if (value.endsWith("ms")) {
            return Number(value.slice(0, -2));
          }
          if (value.endsWith("s")) {
            return Number(value.slice(0, -1)) * 1000;
          }
          return Number(value) || 0;
        })
      );
    }
  });
}

function assertNoPlasticFocusChrome(state, label) {
  const focusText = [state.borderColor, state.boxShadow, state.outlineColor].join(" ");

  if (focusText.includes("10, 132, 255") || focusText.includes("0, 95, 204")) {
    throw new Error(`${label}: focus style still uses system-blue plastic ring`);
  }

  if (state.hardRingLayerCount > 0) {
    throw new Error(`${label}: focus style still uses a hard white/black 1px ring`);
  }

  if (state.borderAlpha >= 0.34 && (state.borderLuma <= 20 || state.borderLuma >= 235)) {
    throw new Error(
      `${label}: focus border is still a high-contrast hard edge (${state.borderColor}, alpha=${state.borderAlpha}, luma=${state.borderLuma})`
    );
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(
      `${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
}

function assertNotEqual(actual, expected, label) {
  if (actual === expected) {
    throw new Error(`${label}: did not expect ${JSON.stringify(expected)}`);
  }
}

function assertGreaterThan(actual, expected, label) {
  if (!(actual > expected)) {
    throw new Error(`${label}: expected ${actual} > ${expected}`);
  }
}

function assertGreaterOrEqual(actual, expected, label) {
  if (!(actual >= expected)) {
    throw new Error(`${label}: expected ${actual} >= ${expected}`);
  }
}

function assertLessThan(actual, expected, label) {
  if (!(actual < expected)) {
    throw new Error(`${label}: expected ${actual} < ${expected}`);
  }
}

function assertIncludes(actual, expected, label) {
  if (!String(actual).includes(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(actual)} to include ${expected}`);
  }
}

function assertLessThanOrEqual(actual, expected, label) {
  if (!(actual <= expected)) {
    throw new Error(`${label}: expected ${actual} <= ${expected}`);
  }
}

function assertApproxEqual(actual, expected, tolerance, label) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${label}: expected ${actual} ~= ${expected} within ${tolerance}`);
  }
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
