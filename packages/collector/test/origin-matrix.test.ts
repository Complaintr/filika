import { describe, expect, test } from "bun:test";

import { checkOrigin, parseOriginHeader } from "../src/origin";
import { isOriginAllowed } from "../src/project";

const ALLOWED = ["http://localhost:4173"];

describe("origin matrix", () => {
  test("accepts an exact origin match", () => {
    const origin = parseOriginHeader("http://localhost:4173");

    expect(origin).toBe("http://localhost:4173");
    if (origin !== null) {
      expect(isOriginAllowed(origin, ALLOWED)).toBe(true);
    }
  });

  test("denies a scheme mismatch", () => {
    const origin = parseOriginHeader("https://localhost:4173");

    expect(origin).toBe("https://localhost:4173");
    if (origin !== null) {
      expect(isOriginAllowed(origin, ALLOWED)).toBe(false);
    }
  });

  test("denies a port mismatch", () => {
    const origin = parseOriginHeader("http://localhost:4174");

    expect(origin).toBe("http://localhost:4174");
    if (origin !== null) {
      expect(isOriginAllowed(origin, ALLOWED)).toBe(false);
    }
  });

  test("denies a subdomain mismatch", () => {
    expect(isOriginAllowed("http://example.com", ["http://example.com"])).toBe(true);
    expect(isOriginAllowed("http://evil.example.com", ["http://example.com"])).toBe(false);
    expect(isOriginAllowed("http://example.com.evil.test", ["http://example.com"])).toBe(false);
  });

  test("rejects a missing origin", () => {
    expect(parseOriginHeader(null)).toBeNull();
    expect(
      checkOrigin(new Request("http://localhost:8787/api/v1/feedback", { method: "POST" })).status,
    ).toBe("rejected");
  });

  test("rejects a null origin string", () => {
    expect(parseOriginHeader("null")).toBeNull();
  });
});
