import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";
import { browserDatabaseUrl } from "./database";

export default defineConfig({
  testDir: ".",
  testMatch: ["specs/**/*.spec.ts"],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: Boolean(process.env.CI),
  timeout: 30_000,
  use: { baseURL: "http://localhost:4173", browserName: "chromium", trace: "retain-on-failure" },
  webServer: [
    {
      command: "bun run dev",
      cwd: fileURLToPath(new URL("../..", import.meta.url)),
      url: "http://localhost:4173/api/v1/inbox",
      reuseExistingServer: false,
      env: {
        DATABASE_URL: browserDatabaseUrl(),
        BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? "test-secret",
      },
    },
  ],
});
