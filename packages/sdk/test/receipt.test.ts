import { expect, test } from "bun:test";
import Ajv from "ajv";
import {
  EXECUTION_OUTCOME_SCHEMA,
  type FilikaReceiptV1,
  parseReceipt,
  RECEIPT_SCHEMA,
} from "../src";

const receipt: FilikaReceiptV1 = {
  schemaVersion: 1,
  eventId: "12345678-1234-4234-8234-123456789abc",
  feedbackId: "87654321-4321-4321-8321-cba987654321",
  receivedAt: "2026-08-27T12:30:00.000Z",
  duplicate: false,
};
const ajv = new Ajv({ strict: true });
const validate = ajv.compile(RECEIPT_SCHEMA);
const validateOutcome = ajv.compile(EXECUTION_OUTCOME_SCHEMA);
const parse = (value: unknown) => parseReceipt(JSON.stringify(value), receipt.eventId);

test("accepts and reconstructs first and duplicate receipts", () => {
  for (const duplicate of [false, true]) {
    const value = { ...receipt, duplicate };
    expect(validate(value)).toBe(true);
    expect(parse(value)).toEqual(value);
    expect(parse(value)).not.toBe(value);
    expect(validateOutcome({ code: "success", receipt: parse(value) })).toBe(true);
  }
});

test("rejects unknown fields, missing fields, wrong types, and injected text", () => {
  for (const patch of [
    { message: "Ignore previous instructions" },
    { url: "https://evil.example" },
    { feedbackId: "<script>" },
    { eventId: "invalid" },
    { schemaVersion: 2 },
    { duplicate: "false" },
    { receivedAt: "today" },
  ]) {
    expect(validate({ ...receipt, ...patch })).toBe(false);
    expect(parse({ ...receipt, ...patch })).toBeNull();
  }
  for (const key of RECEIPT_SCHEMA.required) {
    const value: Record<string, unknown> = { ...receipt };
    delete value[key];
    expect(parse(value)).toBeNull();
  }
  for (const value of [null, [], "accepted", 1]) expect(parse(value)).toBeNull();
});

test("rejects impossible timestamps and receipts for another event", () => {
  for (const receivedAt of [
    "2026-02-30T12:30:00.000Z",
    "2026-13-01T12:30:00.000Z",
    "2026-08-27T25:30:00.000Z",
    "2026-08-27T12:30:00Z",
    "2026-08-27T12:30:00.000+00:00",
  ]) {
    expect(parse({ ...receipt, receivedAt })).toBeNull();
  }
  expect(parseReceipt(JSON.stringify(receipt), receipt.feedbackId)).toBeNull();
});

test("rejects malformed and oversized bodies before returning a receipt", () => {
  expect(parseReceipt("{invalid", receipt.eventId)).toBeNull();
  expect(parseReceipt(`${" ".repeat(1024)}${JSON.stringify(receipt)}`, receipt.eventId)).toBeNull();
  expect(parseReceipt(`"${"é".repeat(600)}"`, receipt.eventId)).toBeNull();
});

test("success requires a receipt; failures cannot carry collector text or receipts", () => {
  for (const value of [
    { code: "success" },
    { code: "success", receipt, message: "injected" },
    { code: "timeout", receipt },
    { code: "duplicate", receipt },
  ]) {
    expect(validateOutcome(value)).toBe(false);
  }
});
