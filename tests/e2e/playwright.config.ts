import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";
import { browserDatabaseUrl } from "./database";
import { webOrigin, webPort } from "./web-origin";

export default defineConfig({
  testDir: ".",
  testMatch: ["specs/**/*.spec.ts"],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: Boolean(process.env.CI),
  timeout: 30_000,
  use: { baseURL: webOrigin, browserName: "chromium", trace: "retain-on-failure" },
  webServer: [
    {
      command: `bun run build:spa && bun run --bun next dev -p ${webPort}`,
      cwd: fileURLToPath(new URL("../../apps/web", import.meta.url)),
      url: `${webOrigin}/api/v1/inbox`,
      reuseExistingServer: false,
      env: {
        DATABASE_URL: browserDatabaseUrl(),
        BETTER_AUTH_URL: webOrigin,
        FILIKA_E2E: "1",
        BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? "test-secret",
      },
    },
  ],
});
