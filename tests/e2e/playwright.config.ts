import { defineConfig } from "@playwright/test";
import { browserDatabaseUrl } from "./database";

export default defineConfig({
  testDir: "./specs",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: Boolean(process.env.CI),
  timeout: 30_000,
  use: { baseURL: "http://localhost:4173", browserName: "chromium", trace: "retain-on-failure" },
  webServer: [
    {
      command: "bun run dev:webmcp",
      cwd: "../..",
      url: "http://localhost:4173",
      reuseExistingServer: false,
    },
    {
      command: "bun run dev:collector",
      cwd: "../..",
      url: "http://localhost:8787/api/v1/inbox",
      env: { DATABASE_URL: browserDatabaseUrl() },
      reuseExistingServer: false,
    },
  ],
});
