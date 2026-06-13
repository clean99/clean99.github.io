import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: ["tests/**/*.spec.ts"],
  outputDir: "test-results",
  snapshotPathTemplate: "{testDir}/{testFileDir}/{testFileName}-snapshots/{arg}-{projectName}{ext}",
  fullyParallel: true,
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  use: {
    trace: "on-first-retry"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
