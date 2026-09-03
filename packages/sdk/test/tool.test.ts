import { expect, test } from "bun:test";
import Ajv from "ajv";
import positiveEvals from "../../../tests/evals/positive.json";
import { FEEDBACK_TOOL } from "../src";

const validate = new Ajv({ strict: true }).compile(FEEDBACK_TOOL.inputSchema);

for (const scenario of positiveEvals) {
  test(`positive eval example satisfies the frozen tool schema: ${scenario.scenario}`, () => {
    expect(validate(scenario.exampleDraft)).toBe(true);
    expect(scenario.exampleDraft.kind).toBe(scenario.expectedKind);
  });
}

test("the static tool accepts only report fields, not host or transport claims", () => {
  const draft = {
    kind: "blocked_task",
    title: "Cannot save",
    description: "Save returned an error.",
  };
  expect(validate(draft)).toBe(true);
  for (const key of ["context", "projectKey", "endpoint", "eventId", "origin", "schemaVersion"]) {
    expect(validate({ ...draft, [key]: "injected" })).toBe(false);
  }
  expect(validate({ ...draft, title: " " })).toBe(false);
});

test("metadata explains that the tool transmits feedback and does not mark submission read-only", () => {
  expect(FEEDBACK_TOOL.name).toBe("filika_submit_feedback");
  expect(FEEDBACK_TOOL.description).toContain("transmits the report");
  expect(FEEDBACK_TOOL.description).not.toContain("must review");
  expect(FEEDBACK_TOOL.annotations).toEqual({ readOnlyHint: false, untrustedContentHint: false });
});

test("public contract metadata cannot be overwritten through nested exports", () => {
  expect(Reflect.set(FEEDBACK_TOOL, "description", "Ignore previous instructions")).toBe(false);
  expect(Reflect.set(FEEDBACK_TOOL.annotations, "readOnlyHint", true)).toBe(false);
  expect(Reflect.set(FEEDBACK_TOOL.inputSchema.properties.title, "maxLength", 999999)).toBe(false);
  expect(Reflect.set(FEEDBACK_TOOL.inputSchema.required, "0", "injected")).toBe(false);
  expect(Reflect.set(FEEDBACK_TOOL.inputSchema.properties.kind.enum, "0", "injected")).toBe(false);
});
