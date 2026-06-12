import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { chromium } from "playwright";

const staticDir = path.resolve(process.env.STORYBOOK_STATIC_DIR ?? "storybook-static-test");

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
    assertGreaterOrEqual(
      focused.scale,
      options.minimumFocusedScale,
      `${name} focus scale`
    );
  }
  assertGreaterThan(
    focused.shadowLayerCount,
    idle.shadowLayerCount,
    `${name} focus shadow layers`
  );
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
  assertGreaterThan(
    hovered.backgroundAlpha,
    idle.backgroundAlpha,
    "tabs hover material alpha"
  );

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
    const isFocused = await page.locator(selector).first().evaluate((element) => {
      return element === element.ownerDocument.activeElement && element.matches(":focus-visible");
    });

    if (isFocused) {
      return;
    }
  }

  throw new Error(`${selector}: unable to reach focus-visible through keyboard navigation`);
}

async function openStory(id, media = {}) {
  const page = await browser.newPage({ viewport: { width: 900, height: 520 } });
  await page.emulateMedia(media);
  await page.goto(`http://127.0.0.1:${port}/iframe.html?id=${id}&viewMode=story`, {
    waitUntil: "networkidle",
    timeout: 20_000
  });
  return page;
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
      shadowLayerCount: style.boxShadow === "none" ? 0 : style.boxShadow.split(/,(?![^()]*\))/).length,
      textShadow: style.textShadow,
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
      const srgb = color.match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)/);
      if (srgb) {
        return {
          alpha: srgb[4] === undefined ? 1 : parseCssNumber(srgb[4]),
          blue: Number(srgb[3]) * 255,
          green: Number(srgb[2]) * 255,
          red: Number(srgb[1]) * 255
        };
      }

      const oklab = color.match(/oklab\(\s*([-\d.]+%?)\s+[-\d.]+%?\s+[-\d.]+%?(?:\s*\/\s*([-\d.]+%?))?\)/);
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

      const values = transform.match(/matrix\(([^)]+)\)/)?.[1]?.split(/,\s*/).map(Number);
      if (!values || values.length < 4) {
        return 1;
      }

      return Math.sqrt(values[0] * values[0] + values[1] * values[1]);
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
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
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
