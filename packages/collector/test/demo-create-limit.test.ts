import { describe, expect, test } from "bun:test";
import { createDemoCreationLimiter, demoClientKey } from "../src/demo-create-limit";

describe("demo creation limiter", () => {
  test("allows up to the per-window budget for one client", () => {
    const limiter = createDemoCreationLimiter({ maxPerWindow: 3, windowMs: 3_600_000 });
    expect(limiter.allow("client-a", new Date("2030-01-01T10:00:00Z"))).toBe(true);
    expect(limiter.allow("client-a", new Date("2030-01-01T10:05:00Z"))).toBe(true);
    expect(limiter.allow("client-a", new Date("2030-01-01T10:10:00Z"))).toBe(true);
    expect(limiter.allow("client-a", new Date("2030-01-01T10:15:00Z"))).toBe(false);
  });

  test("separates budgets per client", () => {
    const limiter = createDemoCreationLimiter({ maxPerWindow: 1, windowMs: 3_600_000 });
    expect(limiter.allow("client-a")).toBe(true);
    expect(limiter.allow("client-a")).toBe(false);
    expect(limiter.allow("client-b")).toBe(true);
  });

  test("resets the budget after the window elapses", () => {
    const limiter = createDemoCreationLimiter({ maxPerWindow: 1, windowMs: 60_000 });
    expect(limiter.allow("client-a", new Date("2030-01-01T10:00:00Z"))).toBe(true);
    expect(limiter.allow("client-a", new Date("2030-01-01T10:00:30Z"))).toBe(false);
    expect(limiter.allow("client-a", new Date("2030-01-01T10:01:00Z"))).toBe(true);
  });
});

describe("demo client key resolution", () => {
  test("prefers the first forwarded address, then Cloudflare, then unknown", () => {
    expect(
      demoClientKey(
        new Request("http://localhost/api/v1/demo/x/app", {
          headers: { "x-forwarded-for": "203.0.113.5, 10.0.0.2" },
        }),
      ),
    ).toBe("203.0.113.5");
    expect(
      demoClientKey(
        new Request("http://localhost/api/v1/demo/x/app", {
          headers: { "cf-connecting-ip": "198.51.100.9" },
        }),
      ),
    ).toBe("198.51.100.9");
    expect(demoClientKey(new Request("http://localhost/api/v1/demo/x/app"))).toBe("unknown");
  });
});
