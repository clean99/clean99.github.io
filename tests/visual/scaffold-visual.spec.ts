import { expect, test } from "@playwright/test";

test("monorepo visual scaffold", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 260 });
  await page.setContent(`
    <style>
      body {
        margin: 0;
        background: #f6f7f8;
      }
      .frame {
        width: 390px;
        height: 260px;
        background:
          linear-gradient(135deg, #f6f7f8 0%, #ffffff 100%);
        position: relative;
      }
      .bar {
        position: absolute;
        left: 32px;
        top: 32px;
        width: 326px;
        height: 54px;
        border: 1px solid #d7dce2;
        border-radius: 27px;
        background: rgba(255, 255, 255, 0.72);
      }
      .card {
        position: absolute;
        left: 32px;
        top: 112px;
        width: 326px;
        height: 104px;
        border: 1px solid #d7dce2;
        border-radius: 18px;
        background: #ffffff;
      }
    </style>
    <div class="frame">
      <div class="bar"></div>
      <div class="card"></div>
    </div>
  `);

  await expect(page.locator(".frame")).toHaveScreenshot("monorepo-scaffold.png", {
    animations: "disabled"
  });
});
