import { describe, expect, test } from "bun:test";

import { buildPreflightResponse, isAllowedOrigin } from "../src/cors";

const ALLOWED_ORIGINS = ["http://localhost:4173", "http://127.0.0.1:4173"];

describe("P2-BE-03 cors preflight", () => {
  test("matches the exact allowed origin", () => {
    expect(isAllowedOrigin("http://localhost:4173", ALLOWED_ORIGINS)).toBe(true);
    expect(isAllowedOrigin("http://localhost:9999", ALLOWED_ORIGINS)).toBe(false);
    expect(isAllowedOrigin("http://evil.example", ALLOWED_ORIGINS)).toBe(false);
  });

  test("allows a known origin with exact headers and vary", () => {
    const response = buildPreflightResponse(
      new Request("http://localhost:8787/api/v1/feedback", {
        headers: { Origin: "http://localhost:4173" },
        method: "OPTIONS",
      }),
      ALLOWED_ORIGINS,
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe("http://localhost:4173");
    expect(response.headers.get("access-control-allow-methods")).toBe("POST, OPTIONS");
    expect(response.headers.get("access-control-allow-headers")).toBe(
      "Content-Type, Idempotency-Key",
    );
    expect(response.headers.get("vary")).toBe("Origin");
  });

  test("never reflects a denied origin", () => {
    const response = buildPreflightResponse(
      new Request("http://localhost:8787/api/v1/feedback", {
        headers: { Origin: "http://evil.example" },
        method: "OPTIONS",
      }),
      ALLOWED_ORIGINS,
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });

  test("never reflects a missing origin", () => {
    const response = buildPreflightResponse(
      new Request("http://localhost:8787/api/v1/feedback", { method: "OPTIONS" }),
      ALLOWED_ORIGINS,
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });
});
