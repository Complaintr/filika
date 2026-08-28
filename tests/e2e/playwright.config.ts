import { defineConfig } from "@playwright/test";

export default defineConfig({
  expect: { timeout: 5_000 },
  fullyParallel: false,
  reporter: "line",
  retries: 0,
  testDir: "./src",
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:4173",
    channel: "chrome",
    headless: true,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "bun --cwd ../.. run dev:webmcp",
    reuseExistingServer: true,
    timeout: 30_000,
    url: "http://localhost:4173",
  },
});
