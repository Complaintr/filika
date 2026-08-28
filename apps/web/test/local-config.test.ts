import { expect, test } from "bun:test";
import { Window } from "happy-dom";
import { DEMO_ALLOWED_ORIGINS, DEMO_PROJECT_KEY } from "../../../packages/collector/src/db/seed";
import { autoInitialize } from "../../../packages/sdk/src/bootstrap";
import { parseConfig } from "../../../packages/sdk/src/config-validation";

test("workspace page loads the SPA without embedding the SDK bootstrap script", async () => {
  const window = new Window();
  window.document.body.innerHTML = await Bun.file(`${import.meta.dir}/../src/index.html`).text();
  const script = window.document.querySelector('script[src="/sdk/filika.development.js"]');
  expect(script).toBeNull();
  expect(window.document.querySelector('script[type="module"][src="/index.ts"]')).not.toBeNull();
  await window.happyDOM.close();
});

test("the demo project origin allowlist covers the local workspace origin", () => {
  expect(DEMO_ALLOWED_ORIGINS).toContain("http://localhost:4173");
  expect(DEMO_PROJECT_KEY).toBe("filika-demo");
});

test("SDK config validation still resolves the seeded demo endpoint through public attributes", async () => {
  const window = new Window();
  const script = window.document.createElement("script");
  script.setAttribute("data-project-key", DEMO_PROJECT_KEY);
  script.setAttribute("data-endpoint", "http://localhost:4173/api/v1/feedback");
  script.setAttribute("data-route-label", "Sample task");
  script.setAttribute("data-application-release", "demo-2026.08");
  let captured: unknown;
  await autoInitialize({ currentScript: script }, async (config) => {
    captured = config;
  });
  expect(captured).toEqual({
    projectKey: DEMO_PROJECT_KEY,
    endpoint: "http://localhost:4173/api/v1/feedback",
    routeLabel: "Sample task",
    applicationRelease: "demo-2026.08",
  });
  expect(parseConfig(captured, true)).not.toBeNull();
  expect(parseConfig(captured, false)).toBeNull();
  await window.happyDOM.close();
});
