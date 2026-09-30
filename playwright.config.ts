import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end smoke tests against a running app (they call the real open-data providers).
 *   npm run dev -- -p 3005   &   npm run test:e2e
 * Override the target with PLAYWRIGHT_BASE_URL, e.g. a Cloud Run URL after deploying.
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 120_000,
  expect: { timeout: 60_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3005",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
