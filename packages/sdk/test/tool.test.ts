import { expect, test } from "bun:test";
import Ajv from "ajv";
import { FEEDBACK_TOOL } from "../src";

const validate = new Ajv({ strict: true }).compile(FEEDBACK_TOOL.inputSchema);

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

test("metadata explicitly requires review and does not mark submission read-only", () => {
  expect(FEEDBACK_TOOL.name).toBe("filika_submit_feedback");
  expect(FEEDBACK_TOOL.description).toContain("review and explicitly confirm");
  expect(FEEDBACK_TOOL.annotations).toEqual({ readOnlyHint: false, untrustedContentHint: false });
});
