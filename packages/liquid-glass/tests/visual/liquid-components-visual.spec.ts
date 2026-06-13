import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const tokens = fs.readFileSync(path.resolve("src/styles/tokens.css"), "utf8");
const styles = fs.readFileSync(path.resolve("src/styles/styles.css"), "utf8");
const screenshotCss = `
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
  }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  }
`;

test.describe("liquid glass component visuals", () => {
  test("component liquid nav light", async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 360 });
    await renderFixture(page, navFixture("light"));
    await expect(page.locator("#fixture")).toHaveScreenshot("component-liquid-nav-light.png");
  });

  test("component liquid nav dark", async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 360 });
    await renderFixture(page, navFixture("dark"));
    await expect(page.locator("#fixture")).toHaveScreenshot("component-liquid-nav-dark.png");
  });

  test("component liquid tabs light", async ({ page }) => {
    await page.setViewportSize({ width: 760, height: 340 });
    await renderFixture(page, tabsFixture("light"));
    await expect(page.locator("#fixture")).toHaveScreenshot("component-liquid-tabs-light.png");
  });

  test("component liquid tabs dark", async ({ page }) => {
    await page.setViewportSize({ width: 760, height: 340 });
    await renderFixture(page, tabsFixture("dark"));
    await expect(page.locator("#fixture")).toHaveScreenshot("component-liquid-tabs-dark.png");
  });

  test("component liquid field light", async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 340 });
    await renderFixture(page, fieldFixture("light"));
    await expect(page.locator("#fixture")).toHaveScreenshot("component-liquid-field-light.png");
  });

  test("component liquid field dark", async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 340 });
    await renderFixture(page, fieldFixture("dark"));
    await expect(page.locator("#fixture")).toHaveScreenshot("component-liquid-field-dark.png");
  });

  test("component liquid dialog light", async ({ page }) => {
    await page.setViewportSize({ width: 720, height: 420 });
    await renderFixture(page, dialogFixture("light"));
    await expect(page.locator("#fixture")).toHaveScreenshot("component-liquid-dialog-light.png");
  });

  test("component liquid dialog dark", async ({ page }) => {
    await page.setViewportSize({ width: 720, height: 420 });
    await renderFixture(page, dialogFixture("dark"));
    await expect(page.locator("#fixture")).toHaveScreenshot("component-liquid-dialog-dark.png");
  });

  test("component liquid accordion light", async ({ page }) => {
    await page.setViewportSize({ width: 720, height: 420 });
    await renderFixture(page, accordionFixture("light"));
    await expect(page.locator("#fixture")).toHaveScreenshot("component-liquid-accordion-light.png");
  });

  test("component liquid accordion dark", async ({ page }) => {
    await page.setViewportSize({ width: 720, height: 420 });
    await renderFixture(page, accordionFixture("dark"));
    await expect(page.locator("#fixture")).toHaveScreenshot("component-liquid-accordion-dark.png");
  });

  test("component liquid button light", async ({ page }) => {
    await page.setViewportSize({ width: 520, height: 260 });
    await renderFixture(page, buttonFixture("light"));
    await expect(page.locator("#fixture")).toHaveScreenshot("component-liquid-button-light.png");
  });

  test("component liquid button dark", async ({ page }) => {
    await page.setViewportSize({ width: 520, height: 260 });
    await renderFixture(page, buttonFixture("dark"));
    await expect(page.locator("#fixture")).toHaveScreenshot("component-liquid-button-dark.png");
  });

  test("component liquid card light", async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 360 });
    await renderFixture(page, cardFixture("light"));
    await expect(page.locator("#fixture")).toHaveScreenshot("component-liquid-card-light.png");
  });

  test("component liquid card dark", async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 360 });
    await renderFixture(page, cardFixture("dark"));
    await expect(page.locator("#fixture")).toHaveScreenshot("component-liquid-card-dark.png");
  });

  test("component liquid toggle light", async ({ page }) => {
    await page.setViewportSize({ width: 520, height: 260 });
    await renderFixture(page, toggleFixture("light"));
    await expect(page.locator("#fixture")).toHaveScreenshot("component-liquid-toggle-light.png");
  });

  test("component liquid toggle dark", async ({ page }) => {
    await page.setViewportSize({ width: 520, height: 260 });
    await renderFixture(page, toggleFixture("dark"));
    await expect(page.locator("#fixture")).toHaveScreenshot("component-liquid-toggle-dark.png");
  });

  test("fallback safari-like light", async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 320 });
    await renderFixture(page, fallbackFixture("light"));
    await expect(page.locator("#fixture")).toHaveScreenshot("fallback-safari-like-light.png");
  });

  test("fallback safari-like dark", async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 320 });
    await renderFixture(page, fallbackFixture("dark"));
    await expect(page.locator("#fixture")).toHaveScreenshot("fallback-safari-like-dark.png");
  });

  test("reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 640, height: 320 });
    await renderFixture(page, navFixture("light"));
    await expect(page.locator("#fixture")).toHaveScreenshot("reduced-motion.png");
  });

  test("high contrast", async ({ page }) => {
    await page.emulateMedia({ contrast: "more" });
    await page.setViewportSize({ width: 640, height: 320 });
    await renderFixture(page, cardFixture("light"));
    await expect(page.locator("#fixture")).toHaveScreenshot("high-contrast.png");
  });

  test("mobile 390", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 540 });
    await renderFixture(page, navFixture("light"));
    await expect(page.locator("#fixture")).toHaveScreenshot("mobile-390.png");
  });
});

async function renderFixture(page: Page, body: string) {
  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <style>${tokens}</style>
        <style>${styles}</style>
        <style>${screenshotCss}</style>
      </head>
      <body>${body}</body>
    </html>
  `);
}

function frame(theme: "light" | "dark", inner: string) {
  const background =
    theme === "dark"
      ? "linear-gradient(135deg, #0f1115, #1f2937 46%, #111827)"
      : "linear-gradient(135deg, #f7f8fb, #d9ecff 44%, #f8fff6)";

  return `
    <main id="fixture" data-lg-theme="${theme}" style="box-sizing:border-box;min-height:100%;padding:32px;color:var(--lg-text);background:${background};">
      ${inner}
    </main>
  `;
}

function navFixture(theme: "light" | "dark") {
  return frame(
    theme,
    `<nav aria-label="Primary navigation" class="lg-nav">
      <div class="lg-surface lg-surface--nav lg-surface--fallback lg-surface--subtle lg-surface--fallback-material lg-nav__surface" data-liquid-mode="fallback">
        <span class="lg-surface__content">
          ${["Home", "Writing", "Projects", "AI Lab", "About", "中文 / EN"]
            .map(
              (item) =>
                `<a class="lg-surface lg-surface--button lg-surface--solid lg-surface--subtle lg-surface--interactive lg-surface--fallback-material" href="#"><span class="lg-surface__content">${item}</span></a>`
            )
            .join("")}
        </span>
      </div>
    </nav>`
  );
}

function tabsFixture(theme: "light" | "dark") {
  return frame(
    theme,
    `<section class="lg-tabs" data-orientation="horizontal" style="max-width:620px;">
      <div role="tablist" aria-label="Writing filters" aria-orientation="horizontal" class="lg-surface lg-surface--panel lg-surface--fallback lg-surface--subtle lg-surface--fallback-material lg-tabs__list" data-liquid-mode="fallback">
        <span class="lg-surface__content">
          <button id="visual-tabs-tab-0" aria-controls="visual-tabs-panel-0" aria-selected="true" class="lg-tabs__tab" role="tab" type="button">Performance</button>
          <button id="visual-tabs-tab-1" aria-controls="visual-tabs-panel-1" aria-selected="false" class="lg-tabs__tab" role="tab" type="button" tabindex="-1">Reliability</button>
          <button id="visual-tabs-tab-2" aria-controls="visual-tabs-panel-2" aria-selected="false" class="lg-tabs__tab" role="tab" type="button" tabindex="-1">Agents</button>
          <button id="visual-tabs-tab-3" aria-controls="visual-tabs-panel-3" aria-selected="false" class="lg-tabs__tab" role="tab" type="button" tabindex="-1">Learning</button>
        </span>
      </div>
      <div id="visual-tabs-panel-0" aria-labelledby="visual-tabs-tab-0" class="lg-tabs__panel" role="tabpanel" tabindex="0">
        <h2 style="margin:0 0 8px;font-size:28px;line-height:1.1;">Performance notes</h2>
        <p style="max-width:520px;margin:0;color:var(--lg-text-muted);line-height:1.55;">A single continuous glass plate keeps the tabs readable while the surface carries the material.</p>
      </div>
    </section>`
  );
}

function fieldFixture(theme: "light" | "dark") {
  return frame(
    theme,
    `<section class="lg-field" style="max-width:500px;">
      <label class="lg-field__label" for="visual-field-title">Article title</label>
      <div class="lg-surface lg-surface--panel lg-surface--fallback lg-surface--subtle lg-surface--fallback-material lg-field-control lg-input-surface" data-liquid-mode="fallback">
        <span class="lg-surface__content">
          <span aria-hidden="true" class="lg-field-control__adornment">#</span>
          <input class="lg-input" id="visual-field-title" placeholder="Liquid Glass in React" />
        </span>
      </div>
      <p class="lg-field__description">Native text stays readable above the material.</p>
    </section>`
  );
}

function dialogFixture(theme: "light" | "dark") {
  return frame(
    theme,
    `<dialog open aria-labelledby="visual-dialog-title" aria-describedby="visual-dialog-description" aria-modal="true" class="lg-surface lg-surface--panel lg-surface--fallback lg-surface--medium lg-surface--fallback-material lg-dialog" data-liquid-mode="fallback" style="position:relative;inset:auto;">
      <span class="lg-surface__content">
        <div class="lg-dialog__header">
          <h2 class="lg-dialog__title" id="visual-dialog-title">Share article</h2>
          <p class="lg-dialog__description" id="visual-dialog-description">Copy a stable link without distorting the foreground content.</p>
        </div>
        <p style="margin:0;color:var(--lg-text-muted);line-height:1.55;">The dialog surface carries the glass. Text and actions stay sharp.</p>
        <div class="lg-dialog__footer">
          <button class="lg-surface lg-surface--button lg-surface--solid lg-surface--subtle lg-surface--interactive lg-surface--fallback-material"><span class="lg-surface__content">Cancel</span></button>
          <button class="lg-surface lg-surface--button lg-surface--fallback lg-surface--medium lg-surface--interactive lg-surface--fallback-material"><span class="lg-surface__content">Copy link</span></button>
        </div>
      </span>
    </dialog>`
  );
}

function accordionFixture(theme: "light" | "dark") {
  return frame(
    theme,
    `<section class="lg-accordion" style="max-width:560px;">
      <section class="lg-surface lg-surface--panel lg-surface--fallback lg-surface--subtle lg-surface--fallback-material lg-accordion__item" data-liquid-mode="fallback" data-state="open">
        <span class="lg-surface__content">
          <h3 class="lg-accordion__heading">
            <button id="visual-accordion-trigger-0" aria-controls="visual-accordion-panel-0" aria-expanded="true" class="lg-accordion__trigger" type="button">
              <span class="lg-accordion__title">Foreground content stays sharp</span>
              <span aria-hidden="true" class="lg-accordion__chevron">+</span>
            </button>
          </h3>
          <div id="visual-accordion-panel-0" aria-labelledby="visual-accordion-trigger-0" class="lg-accordion__panel" role="region">
            The surface carries the Liquid Glass material. Text remains a readable foreground layer.
          </div>
        </span>
      </section>
      <section class="lg-surface lg-surface--panel lg-surface--fallback lg-surface--subtle lg-surface--fallback-material lg-accordion__item" data-liquid-mode="fallback" data-state="closed">
        <span class="lg-surface__content">
          <h3 class="lg-accordion__heading">
            <button id="visual-accordion-trigger-1" aria-controls="visual-accordion-panel-1" aria-expanded="false" class="lg-accordion__trigger" type="button">
              <span class="lg-accordion__title">Chrome enhanced, fallback everywhere else</span>
              <span aria-hidden="true" class="lg-accordion__chevron">+</span>
            </button>
          </h3>
          <div id="visual-accordion-panel-1" aria-labelledby="visual-accordion-trigger-1" class="lg-accordion__panel" hidden role="region">
            Hidden panel.
          </div>
        </span>
      </section>
      <section class="lg-surface lg-surface--panel lg-surface--fallback lg-surface--subtle lg-surface--fallback-material lg-accordion__item" data-liquid-mode="fallback" data-state="closed">
        <span class="lg-surface__content">
          <h3 class="lg-accordion__heading">
            <button id="visual-accordion-trigger-2" aria-controls="visual-accordion-panel-2" aria-expanded="false" class="lg-accordion__trigger" type="button">
              <span class="lg-accordion__title">Arrow keys, Home, End</span>
              <span aria-hidden="true" class="lg-accordion__chevron">+</span>
            </button>
          </h3>
          <div id="visual-accordion-panel-2" aria-labelledby="visual-accordion-trigger-2" class="lg-accordion__panel" hidden role="region">
            Hidden panel.
          </div>
        </span>
      </section>
    </section>`
  );
}

function buttonFixture(theme: "light" | "dark") {
  return frame(
    theme,
    `<button class="lg-surface lg-surface--button lg-surface--fallback lg-surface--medium lg-surface--interactive lg-surface--fallback-material">
      <span class="lg-surface__content">Read Writing</span>
    </button>`
  );
}

function cardFixture(theme: "light" | "dark") {
  return frame(
    theme,
    `<article class="lg-surface lg-surface--card lg-surface--fallback lg-surface--subtle lg-surface--fallback-material" style="max-width:520px;">
      <span class="lg-surface__content" style="display:grid;gap:12px;justify-items:start;">
        <span class="lg-surface lg-surface--pill lg-surface--solid lg-surface--subtle lg-surface--fallback-material"><span class="lg-surface__content">Frontend Systems</span></span>
        <h2 style="margin:0;font-size:28px;">Workspace V2 Tab System</h2>
        <p style="margin:0;color:var(--lg-text-muted);line-height:1.6;">Reliable frontend architecture with readable fallback material.</p>
      </span>
    </article>`
  );
}

function toggleFixture(theme: "light" | "dark") {
  return frame(
    theme,
    `<button aria-pressed="true" data-state="on" class="lg-surface lg-surface--toggle lg-surface--fallback lg-surface--subtle lg-surface--interactive lg-surface--fallback-material">
      <span class="lg-surface__content">Dark mode</span>
    </button>`
  );
}

function fallbackFixture(theme: "light" | "dark") {
  return frame(
    theme,
    `<div class="lg-surface lg-surface--panel lg-surface--fallback lg-surface--strong lg-surface--fallback-gradient" style="max-width:520px;">
      <span class="lg-surface__content">Safari and Firefox fallback remains readable.</span>
    </div>`
  );
}
