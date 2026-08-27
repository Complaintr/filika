import { expect, test } from "bun:test";
import { version } from "../src";
import { createContext, reviewedContext } from "../src/context";

test("context contains only SDK version and fixed optional host labels", () => {
  const config = {
    projectKey: "demo",
    endpoint: "https://collector.example",
    routeLabel: "editor",
    applicationRelease: "demo-1",
    get location() {
      throw new Error("Ambient read");
    },
  };
  expect(createContext(config)).toEqual({
    sdkVersion: version,
    routeLabel: "editor",
    applicationRelease: "demo-1",
  });
  expect(createContext({ projectKey: "demo", endpoint: config.endpoint })).toEqual({
    sdkVersion: version,
  });
  expect(Object.isFrozen(createContext(config))).toBe(true);
});

test("review can remove optional context without changing SDK or host-owned values", () => {
  const original = { sdkVersion: version, routeLabel: "editor" };
  expect(reviewedContext({ sdkVersion: version }, original)).toEqual({ sdkVersion: version });
  expect(reviewedContext(original, original)).toEqual(original);
  for (const value of [
    {},
    { ...original, sdkVersion: "9.9.9" },
    { ...original, routeLabel: "changed" },
    { ...original, applicationRelease: "injected" },
    { ...original, location: "secret" },
    { ...original, routeLabel: undefined },
  ]) {
    expect(reviewedContext(value, original)).toBeNull();
  }
});
