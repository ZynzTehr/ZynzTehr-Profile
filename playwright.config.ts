import fs from "node:fs";
import { chromium, defineConfig, devices } from "@playwright/test";

const hasBundledChromium = (() => {
  try {
    return fs.existsSync(chromium.executablePath());
  } catch {
    return false;
  }
})();

const browserChannel =
  process.env.PLAYWRIGHT_CHANNEL ||
  (!hasBundledChromium &&
  fs.existsSync("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
    ? "chrome"
    : undefined);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    channel: browserChannel,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        channel: browserChannel,
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
  webServer: {
    command: "npm run build && npx vite preview --host 127.0.0.1 --port 4173 --strictPort",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
