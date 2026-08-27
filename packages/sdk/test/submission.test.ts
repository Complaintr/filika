import { expect, test } from "bun:test";
import { version } from "../src";
import { createContext, reviewedContext } from "../src/context";
import { parseDraft, prepareSubmission, submissionHeaders } from "../src/submission";

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

const config = { projectKey: "demo", endpoint: "https://collector.example" };
const draft = { kind: "bug", title: "Save failed", description: "The save action failed." };
const eventId = "12345678-1234-4234-8234-123456789abc";

test("generates one UUID and uses it for the envelope and Idempotency-Key", () => {
  let generated = 0;
  const prepared = prepareSubmission(config, draft, createContext(config), () => {
    generated++;
    return eventId;
  });
  if (!prepared) throw new Error("Expected submission");
  expect(generated).toBe(1);
  expect(JSON.parse(prepared.body).eventId).toBe(eventId);
  expect(submissionHeaders(prepared)).toEqual({
    "Content-Type": "application/json",
    "Idempotency-Key": eventId,
  });
  expect(Object.isFrozen(prepared)).toBe(true);
  expect(prepareSubmission(config, draft, createContext(config), () => "bad-id")).toBeNull();
});

test("validates untrusted drafts before creating a transport envelope", () => {
  for (const patch of [
    { eventId },
    { title: " " },
    { description: "\ud800" },
    { kind: "other" },
    { expectedBehavior: null },
    { reproductionSteps: [" "] },
    { reproductionSteps: Array(11).fill("step") },
  ]) {
    expect(parseDraft({ ...draft, ...patch })).toBeNull();
  }
  const source = { ...draft, reproductionSteps: ["Click Save"] };
  const copy = parseDraft(source);
  source.reproductionSteps.push("changed");
  expect(copy?.reproductionSteps).toEqual(["Click Save"]);
  expect(
    parseDraft({
      ...draft,
      description: "😀".repeat(4000),
      expectedBehavior: "😀".repeat(2000),
      reproductionSteps: ["😀".repeat(500)],
    }),
  ).toBeNull();
});

test("draft validation rejects accessors, sparse arrays, symbol fields, and serialization hooks", () => {
  let accessed = false;
  const steps = ["step"];
  Object.defineProperty(steps, "0", {
    get() {
      accessed = true;
      return "step";
    },
  });
  for (const value of [
    { ...draft, reproductionSteps: steps },
    { ...draft, reproductionSteps: Array(1) },
    { ...draft, [Symbol("extra")]: true },
    {
      ...draft,
      toJSON() {
        accessed = true;
        return draft;
      },
    },
    {
      ...draft,
      get title() {
        accessed = true;
        return "secret";
      },
    },
  ]) {
    expect(parseDraft(value)).toBeNull();
  }
  expect(accessed).toBe(false);
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
