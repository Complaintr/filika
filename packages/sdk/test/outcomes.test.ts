import { expect, test } from "bun:test";
import Ajv from "ajv";
import { UI_STATE_IDS } from "../../../apps/web/src/foundation/ui-states";
import { EXECUTION_OUTCOME_CODES, FAILURE_OUTCOME_SCHEMA } from "../src";

const validate = new Ajv({ strict: true }).compile(FAILURE_OUTCOME_SCHEMA);

test("failure results accept only the closed failure codes", () => {
  for (const code of EXECUTION_OUTCOME_CODES) {
    expect(validate({ code })).toBe(code !== "success");
  }
  for (const value of [
    {},
    { code: "duplicate" },
    { code: "error" },
    { code: null },
    { code: "aborted", message: "injected" },
    { code: "timeout", receipt: {} },
  ]) {
    expect(validate(value)).toBe(false);
  }
});

test("execution codes map to the existing frontend states", () => {
  for (const code of EXECUTION_OUTCOME_CODES) {
    expect(UI_STATE_IDS).toContain(code);
  }
});
