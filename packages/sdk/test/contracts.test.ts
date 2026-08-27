import { expect, test } from "bun:test";
import {
  CONFIG_SCHEMA,
  CONFIG_SCRIPT_ATTRIBUTES,
  EXECUTION_LIMITS,
  EXECUTION_OUTCOME_CODES,
  EXECUTION_OUTCOME_RULES,
  EXECUTION_OUTCOME_SCHEMA,
  FEEDBACK_ENVELOPE_SCHEMA,
  FEEDBACK_LIMITS,
  FEEDBACK_TOOL,
  LIFECYCLE_TRANSITIONS,
  RECEIPT_SCHEMA,
  REGISTRATION_DIAGNOSTICS,
} from "../src";

test("snapshot: static WebMCP tool metadata and input schema", () => {
  expect(FEEDBACK_TOOL).toMatchSnapshot();
});

test("snapshot: complete V1 envelope schema and limits", () => {
  expect({ schema: FEEDBACK_ENVELOPE_SCHEMA, limits: FEEDBACK_LIMITS }).toMatchSnapshot();
});

test("snapshot: validated receipt shape", () => {
  expect(RECEIPT_SCHEMA).toMatchSnapshot();
});

test("snapshot: closed outcomes, semantics, and execution limits", () => {
  expect({
    codes: EXECUTION_OUTCOME_CODES,
    rules: EXECUTION_OUTCOME_RULES,
    schema: EXECUTION_OUTCOME_SCHEMA,
    limits: EXECUTION_LIMITS,
  }).toMatchSnapshot();
});

test("snapshot: public configuration and lifecycle", () => {
  expect({
    schema: CONFIG_SCHEMA,
    scriptAttributes: CONFIG_SCRIPT_ATTRIBUTES,
    transitions: LIFECYCLE_TRANSITIONS,
    diagnostics: REGISTRATION_DIAGNOSTICS,
  }).toMatchSnapshot();
});
