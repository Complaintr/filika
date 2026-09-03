import { describe, expect, test } from "bun:test";
import { createInstallSnippet, createSetupBrief } from "../src/onboarding/setup";

describe("onboarding setup instructions", () => {
  test("uses the production SDK for an HTTPS collector", () => {
    expect(createInstallSnippet("https://feedback.example", "app_demo")).toBe(`<script
  src="https://feedback.example/sdk/filika.js"
  data-project-key="app_demo"
  data-endpoint="https://feedback.example/api/v1/feedback"
  defer
></script>`);
  });

  test("uses the development SDK only for a local HTTP collector", () => {
    expect(createInstallSnippet("http://localhost:4173", "app_demo")).toContain(
      "/sdk/filika.development.js",
    );
    expect(() => createInstallSnippet("http://feedback.example", "app_demo")).toThrow();
  });

  test("rejects malformed origins and application keys", () => {
    expect(() => createInstallSnippet("https://feedback.example/path", "app_demo")).toThrow();
    expect(() => createInstallSnippet("https://feedback.example", 'bad" key')).toThrow();
  });

  test("builds a complete handoff brief without hidden network actions", () => {
    const brief = createSetupBrief({
      applicationName: "My Store",
      collectorOrigin: "https://feedback.example",
      projectKey: "app_demo",
      websiteOrigin: "https://my-store.example",
    });
    expect(brief).toContain("Set up Filika for My Store");
    expect(brief).toContain("https://my-store.example");
    expect(brief).toContain("Send a test feedback report through Filika.");
  });

  test("guides the user to add a missing origin before verifying", () => {
    const brief = createSetupBrief({
      applicationName: "My Store",
      collectorOrigin: "https://feedback.example",
      projectKey: "app_demo",
    });
    expect(brief).toContain("Add your website origin in Filika application settings");
    expect(brief).not.toContain("Allowed website origin:");
    expect(brief).toContain(createInstallSnippet("https://feedback.example", "app_demo"));
  });
});
