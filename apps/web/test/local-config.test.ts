import { expect, test } from "bun:test";
import { Window } from "happy-dom";
import { DEMO_ALLOWED_ORIGINS, DEMO_PROJECT_KEY } from "../../../packages/collector/src/db/seed";
import { autoInitialize } from "../../../packages/sdk/src/bootstrap";
import { parseConfig } from "../../../packages/sdk/src/config-validation";

test("demo script initializes only through fixed public attributes matching the local seed", async () => {
  const window = new Window();
  window.document.body.innerHTML = await Bun.file(`${import.meta.dir}/../src/index.html`).text();
  const script = window.document.querySelector('script[src="/sdk/filika.development.js"]');
  expect(script).not.toBeNull();
  let captured: unknown;
  await autoInitialize({ currentScript: script }, async (config) => {
    captured = config;
  });
  expect(captured).toEqual({
    projectKey: DEMO_PROJECT_KEY,
    endpoint: "http://localhost:8787/api/v1/feedback",
    routeLabel: "Sample task",
    applicationRelease: "demo-2026.08",
  });
  expect(DEMO_ALLOWED_ORIGINS).toContain("http://localhost:4173");
  expect(parseConfig(captured, true)).not.toBeNull();
  expect(parseConfig(captured, false)).toBeNull();
  await window.happyDOM.close();
});
