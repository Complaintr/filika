import { describe, expect, test } from "bun:test";
import { allowOriginHeaders } from "../src/cors";
import { decodeCursor, encodeCursor } from "../src/inbox";

describe("P2-BE-12 inbox queries", () => {
  test("encodes and decodes a composite cursor", () => {
    const cursor = encodeCursor("2026-08-27T18:00:00.000Z", "9f8e7d6c-5b4a-4321-9876-123456789abc");

    expect(decodeCursor(cursor)).toEqual({
      id: "9f8e7d6c-5b4a-4321-9876-123456789abc",
      timestamp: "2026-08-27T18:00:00.000Z",
    });
  });

  test("rejects a malformed cursor", () => {
    expect(decodeCursor("no-separator")).toBeNull();
    expect(decodeCursor("not-a-date|")).toBeNull();
    expect(decodeCursor("2026-08-27T18:00:00.000Z|")).toBeNull();
  });

  test("adds allow-origin headers for a known origin", () => {
    const headers = allowOriginHeaders(
      new Request("http://localhost:8787/api/v1/inbox", {
        headers: { Origin: "http://localhost:4173" },
      }),
      ["http://localhost:4173"],
    );

    expect(headers.get("access-control-allow-origin")).toBe("http://localhost:4173");
    expect(headers.get("vary")).toBe("Origin");
  });

  test("never reflects a denied origin", () => {
    const headers = allowOriginHeaders(
      new Request("http://localhost:8787/api/v1/inbox", {
        headers: { Origin: "http://evil.example" },
      }),
      ["http://localhost:4173"],
    );

    expect(headers.get("access-control-allow-origin")).toBeNull();
  });
});
