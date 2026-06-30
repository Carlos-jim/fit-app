import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for Bioma.
 *
 * Defaults to a Chromium smoke test against a locally running backend
 * (the suite itself skips when the backend is unreachable, so CI on machines
 * without a DB can still pass). The mobile viewport matches the most common
 * iPhone size so we catch React Native Web regressions too.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    viewport: { width: 390, height: 844 }, // iPhone 14
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
