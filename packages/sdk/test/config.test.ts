import { expect, test } from "bun:test";
import Ajv from "ajv";
import { CONFIG_SCHEMA } from "../src";

// JSON Schema's URI format and the contract's HTTPS/authority policy are both required.
const validate = new Ajv({ strict: true })
  .addFormat("uri", (value: string) => {
    try {
      const url = new URL(value);
      return Boolean(url.hostname) && !url.username && !url.password && !url.search && !url.hash;
    } catch {
      return false;
    }
  })
  .compile(CONFIG_SCHEMA);

test("accepts static configuration with optional bounded labels", () => {
  expect(
    validate({ projectKey: "demo", endpoint: "https://collector.example/api/v1/feedback" }),
  ).toBe(true);
  expect(
    validate({
      projectKey: "demo",
      endpoint: "https://collector.example:8443/api/v1/feedback",
      routeLabel: "editor",
      applicationRelease: "demo-1",
    }),
  ).toBe(true);
});

test("rejects unsafe or malformed production endpoints", () => {
  for (const endpoint of [
    "http://localhost:4173/api/v1/feedback",
    "/api/v1/feedback",
    "javascript:alert(1)",
    "https://",
    "https://user:secret@collector.example",
    "https://collector.example?token=secret",
    "https://collector.example#fragment",
    " https://collector.example",
    "https://collector.example\\path",
    `https://collector.example/${"a".repeat(2048)}`,
  ]) {
    expect(validate({ projectKey: "demo", endpoint })).toBe(false);
  }
});

test("requires configuration fields and rejects unknown or dynamic values", () => {
  const config = { projectKey: "demo", endpoint: "https://collector.example" };
  for (const patch of [
    { projectKey: "" },
    { routeLabel: () => "dynamic" },
    { applicationRelease: null },
    { routeLabel: " " },
    { routeLabel: "a".repeat(121) },
    { applicationRelease: "a".repeat(81) },
    { allowHttp: true },
    { apiKey: "secret" },
  ]) {
    expect(validate({ ...config, ...patch })).toBe(false);
  }
  expect(validate({ projectKey: "demo" })).toBe(false);
  expect(validate({ endpoint: config.endpoint })).toBe(false);
});
