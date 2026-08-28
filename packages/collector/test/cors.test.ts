import { describe, expect, test } from "bun:test";

import { buildPreflightResponse, isAllowedOrigin } from "../src/cors";

const ALLOWED_ORIGINS = ["http://localhost:4173", "http://127.0.0.1:4173"];

describe("cors preflight", () => {
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

  test("advertises only the allowed preflight methods", () => {
    for (const method of ["POST", "OPTIONS", "DELETE", "PUT", "GET"]) {
      const response = buildPreflightResponse(
        new Request("http://localhost:8787/api/v1/feedback", {
          headers: {
            "Access-Control-Request-Method": method,
            Origin: "http://localhost:4173",
          },
          method: "OPTIONS",
        }),
        ALLOWED_ORIGINS,
      );

      expect(response.headers.get("access-control-allow-methods")).toBe("POST, OPTIONS");
    }
  });

  test("advertises only the allowed preflight headers", () => {
    const response = buildPreflightResponse(
      new Request("http://localhost:8787/api/v1/feedback", {
        headers: {
          "Access-Control-Request-Headers": "Content-Type, Idempotency-Key, Authorization",
          Origin: "http://localhost:4173",
        },
        method: "OPTIONS",
      }),
      ALLOWED_ORIGINS,
    );

    const allowed = response.headers.get("access-control-allow-headers")?.split(", ") ?? [];

    expect(allowed).toEqual(["Content-Type", "Idempotency-Key"]);
    expect(allowed).not.toContain("Authorization");
  });

  test("keeps the vary header on every allowed preflight", () => {
    for (const origin of ALLOWED_ORIGINS) {
      const response = buildPreflightResponse(
        new Request("http://localhost:8787/api/v1/feedback", {
          headers: { Origin: origin },
          method: "OPTIONS",
        }),
        ALLOWED_ORIGINS,
      );

      expect(response.headers.get("vary")).toBe("Origin");
      expect(response.headers.get("access-control-allow-origin")).toBe(origin);
    }
  });
});
