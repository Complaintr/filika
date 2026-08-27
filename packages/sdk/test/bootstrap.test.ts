import { expect, test } from "bun:test";
import { autoInitialize } from "../src/bootstrap";

test("auto-initialization reads only the current script's four fixed attributes", async () => {
  const reads: string[] = [];
  const attributes: Record<string, string> = {
    "data-project-key": "demo",
    "data-endpoint": "https://collector.example/api/v1/feedback",
    "data-route-label": "editor",
    "data-application-release": "demo-1",
  };
  const configs: unknown[] = [];
  const pending = autoInitialize(
    {
      currentScript: {
        getAttribute(name) {
          reads.push(name);
          return attributes[name] ?? null;
        },
      },
    },
    async (config) => {
      configs.push(config);
    },
  );
  attributes["data-project-key"] = "changed";
  await pending;
  expect(reads).toEqual(Object.keys(attributes));
  expect(configs).toEqual([
    {
      projectKey: "demo",
      endpoint: attributes["data-endpoint"],
      routeLabel: "editor",
      applicationRelease: "demo-1",
    },
  ]);
});

test("no script or attributes is a no-op; partial/empty configuration reaches validation", async () => {
  const configs: unknown[] = [];
  const init = async (value: unknown) => {
    configs.push(value);
  };
  await autoInitialize({ currentScript: null }, init);
  await autoInitialize({ currentScript: { getAttribute: () => null } }, init);
  expect(configs).toEqual([]);
  await autoInitialize(
    { currentScript: { getAttribute: (key) => (key === "data-project-key" ? "" : null) } },
    init,
  );
  expect(configs).toEqual([{ projectKey: "" }]);
});

test("attribute and initialization failures never escape bootstrap", async () => {
  await autoInitialize(
    {
      get currentScript(): null {
        throw new Error("private");
      },
    },
    async () => {},
  );
  await autoInitialize({ currentScript: { getAttribute: () => "demo" } }, async () => {
    throw new Error("private");
  });
});
