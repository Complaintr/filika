import { expect, test } from "bun:test";
import candidate from "../../../releases/candidate-manifest.json";
import frozenV1 from "../../../releases/v1-protocol.json";
import {
  CONFIG_LIMITS,
  CONFIG_SCHEMA,
  CONFIG_SCRIPT_ATTRIBUTES,
  DEVELOPMENT_ENDPOINT_HOSTS,
  EXECUTION_LIMITS,
  EXECUTION_OUTCOME_CODES,
  EXECUTION_OUTCOME_RULES,
  EXECUTION_OUTCOME_SCHEMA,
  FEEDBACK_ENVELOPE_SCHEMA,
  FEEDBACK_LIMITS,
  FEEDBACK_TOOL,
  INITIALIZATION_STATUSES,
  LIFECYCLE_TRANSITIONS,
  RECEIPT_SCHEMA,
  REGISTRATION_DIAGNOSTICS,
  REVIEW_EVENT,
} from "../src";

test("the frozen V1 release artifact matches the public contract and recorded checksum", async () => {
  expect<unknown>(frozenV1).toEqual({
    formatVersion: 1,
    protocolVersion: 1,
    tool: FEEDBACK_TOOL,
    envelope: { schema: FEEDBACK_ENVELOPE_SCHEMA, limits: FEEDBACK_LIMITS },
    receipt: RECEIPT_SCHEMA,
    outcomes: {
      codes: EXECUTION_OUTCOME_CODES,
      rules: EXECUTION_OUTCOME_RULES,
      schema: EXECUTION_OUTCOME_SCHEMA,
      limits: EXECUTION_LIMITS,
    },
    configuration: {
      schema: CONFIG_SCHEMA,
      limits: CONFIG_LIMITS,
      scriptAttributes: CONFIG_SCRIPT_ATTRIBUTES,
      developmentHosts: DEVELOPMENT_ENDPOINT_HOSTS,
    },
    lifecycle: {
      statuses: INITIALIZATION_STATUSES,
      transitions: LIFECYCLE_TRANSITIONS,
      diagnostics: REGISTRATION_DIAGNOSTICS,
    },
    reviewEvent: REVIEW_EVENT,
  });
  const bytes = await Bun.file(
    new URL("../../../releases/v1-protocol.json", import.meta.url),
  ).bytes();
  expect(new Bun.CryptoHasher("sha256").update(bytes).digest("hex")).toBe(
    candidate.protocol.sha256,
  );
});

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
