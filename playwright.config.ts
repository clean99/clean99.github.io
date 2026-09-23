import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT || 4334);
const DIST = process.env.E2E_DIST || "dist";
// CI installs Playwright's own Chromium; a machine where that download is
// blocked can point at an installed Chrome instead (`E2E_CHANNEL=chrome`).
const CHANNEL = process.env.E2E_CHANNEL;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  ...(process.env.CI ? { workers: 2 } : {}),
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  timeout: 30_000,
  expect: { timeout: 5_000 },

  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    colorScheme: "light"
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(CHANNEL ? { channel: CHANNEL } : {}),
        // The axe scan and the theme assertions both need a settled color scheme,
        // so the OS preference is pinned rather than inherited from the runner.
        colorScheme: "light"
      }
    }
  ],

  // Serving the built directory through the same resolver GitHub Pages uses
  // keeps the E2E run honest about trailing slashes and the 404 fallback.
  webServer: {
    command: `node scripts/serve-static.mjs --dist ${DIST} --port ${PORT}`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    stdout: "pipe",
    stderr: "pipe"
  }
});
