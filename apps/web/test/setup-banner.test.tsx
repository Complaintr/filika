import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { Application } from "../src/services/applications-api";
import { SetupBanner } from "../src/workspace/workspace-shell";

const application: Application = {
  allowedOrigins: ["https://eckra.example"],
  dashboardDays: 30,
  displayName: "Eckra",
  integrationVerifiedAt: null,
  projectKey: "app_demo",
  retentionHours: 24,
  slug: "eckra",
};

test("setup banner returns an unverified application to its resumable onboarding", () => {
  const html = renderToStaticMarkup(<SetupBanner application={application} />);
  expect(html).toContain("Setup incomplete");
  expect(html).toContain("Send one reviewed report from Eckra");
  expect(html).toContain('href="/onboarding?app=eckra"');
});
