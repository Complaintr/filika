import { describe, expect, test } from "bun:test";

import { consoleLogger, type IngestLogEvent, silentLogger } from "../src/logger";

const FORBIDDEN_IN_LOG = [
  /\b[0-9]{1,3}(\.[0-9]{1,3}){3}\b/u,
  /\b[0-9a-f]{1,4}(:[0-9a-f]{1,4}){2,7}\b/u,
  /token/iu,
  /authorization/iu,
  /bearer/iu,
  /cookie/iu,
  /secret/iu,
  /title/iu,
  /description/iu,
  /reproductionSteps/iu,
  /expectedBehavior/iu,
] as const;

function assertLogSafe(event: IngestLogEvent): void {
  const serialized = JSON.stringify(event);

  for (const pattern of FORBIDDEN_IN_LOG) {
    expect(serialized).not.toMatch(pattern);
  }
}

describe("structured validation logging", () => {
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

  test("never logs report bodies, raw ips, tokens, or headers", () => {
    assertLogSafe({
      category: "denied_origin",
      eventId: null,
      projectKey: null,
      type: "ingest_rejected",
    });
    assertLogSafe({
      feedbackId: "9f8e7d6c-5b4a-4321-9876-123456789abc",
      projectKey: "filika-demo",
      source: "web_sdk_unverified",
      type: "ingest_accepted",
    });
    assertLogSafe({
      eventId: "7f5e9c2a-9d4e-4b1c-a1f3-2b6c8d0e1a4b",
      feedbackId: "9f8e7d6c-5b4a-4321-9876-123456789abc",
      projectKey: "filika-demo",
      type: "ingest_duplicate",
    });
  });

  test("keeps every log event to its closed key set", () => {
    const rejected: IngestLogEvent = {
      category: "rate_limited",
      eventId: "7f5e9c2a-9d4e-4b1c-a1f3-2b6c8d0e1a4b",
      projectKey: "filika-demo",
      type: "ingest_rejected",
    };
    const accepted: IngestLogEvent = {
      feedbackId: "9f8e7d6c-5b4a-4321-9876-123456789abc",
      projectKey: "filika-demo",
      source: "web_sdk_unverified",
      type: "ingest_accepted",
    };

    expect(Object.keys(rejected).sort()).toEqual(
      ["category", "eventId", "projectKey", "type"].sort(),
    );
    expect(Object.keys(accepted).sort()).toEqual(
      ["feedbackId", "projectKey", "source", "type"].sort(),
    );
  });
});
