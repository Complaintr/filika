import { describe, expect, test } from "bun:test";

import { consoleLogger, type IngestLogEvent, silentLogger } from "../src/logger";

describe("P2-BE-14 structured validation logging", () => {
  test("records a rejected outcome without report content", () => {
    const event: IngestLogEvent = {
      category: "denied_origin",
      eventId: null,
      projectKey: null,
      type: "ingest_rejected",
    };
    const serialized = JSON.stringify(event);

    expect(serialized).toContain('"category":"denied_origin"');
    expect(serialized).toContain('"type":"ingest_rejected"');
    expect(serialized).not.toMatch(/title/);
    expect(serialized).not.toMatch(/description/);
    expect(serialized).not.toMatch(/reproductionSteps/);
  });

  test("records an accepted outcome with server identifiers only", () => {
    const event: IngestLogEvent = {
      feedbackId: "9f8e7d6c-5b4a-4321-9876-123456789abc",
      projectKey: "filika-demo",
      source: "web_sdk_unverified",
      type: "ingest_accepted",
    };
    const serialized = JSON.stringify(event);

    expect(serialized).toContain("feedbackId");
    expect(serialized).toContain("projectKey");
    expect(serialized).toContain('"source":"web_sdk_unverified"');
    expect(serialized).not.toMatch(/title/);
    expect(serialized).not.toMatch(/description/);
  });

  test("console logger writes structured json", () => {
    const writes: string[] = [];
    const original = console.log;

    console.log = (message?: unknown) => {
      writes.push(String(message));
    };

    try {
      consoleLogger.log({
        category: "rate_limited",
        eventId: null,
        projectKey: "filika-demo",
        type: "ingest_rejected",
      });
    } finally {
      console.log = original;
    }

    expect(writes).toHaveLength(1);
    expect(JSON.parse(writes[0] ?? "{}")).toMatchObject({
      category: "rate_limited",
      type: "ingest_rejected",
    });
  });

  test("silent logger never writes", () => {
    const writes: string[] = [];
    const original = console.log;

    console.log = (message?: unknown) => {
      writes.push(String(message));
    };

    try {
      silentLogger.log({
        feedbackId: "9f8e7d6c-5b4a-4321-9876-123456789abc",
        projectKey: "filika-demo",
        source: "web_sdk_unverified",
        type: "ingest_accepted",
      });
    } finally {
      console.log = original;
    }

    expect(writes).toHaveLength(0);
  });
});
