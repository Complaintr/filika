import { describe, expect, test } from "bun:test";

import {
  evaluateWindow,
  PROJECT_RATE_LIMIT_DEFAULT_MAX,
  RATE_LIMIT_CONTRACT,
  windowKey,
} from "../src/rate-limit";

describe("P1-BE-07 atomic project rate-limit behavior", () => {
  test("allows a request below the window limit and increments atomically", () => {
    expect(evaluateWindow(0, 10)).toEqual({ allowed: true, nextCount: 1 });
    expect(evaluateWindow(9, 10)).toEqual({ allowed: true, nextCount: 10 });
  });

  test("denies at the window limit without overflowing", () => {
    expect(evaluateWindow(10, 10)).toEqual({ allowed: false, nextCount: 10 });
    expect(evaluateWindow(11, 10)).toEqual({ allowed: false, nextCount: 11 });
  });

  test("scopes the limit per project and per window", () => {
    const key = windowKey("project-a", "2026-08-27T18:00:00.000Z");

    expect(key).toBe("project-a:2026-08-27T18:00:00.000Z");
    expect(windowKey("project-a", "2026-08-27T19:00:00.000Z")).not.toBe(key);
    expect(windowKey("project-b", "2026-08-27T18:00:00.000Z")).not.toBe(key);
  });

  test("pins the atomic durable contract", () => {
    expect(RATE_LIMIT_CONTRACT.atomic).toBe(true);
    expect(RATE_LIMIT_CONTRACT.durable).toBe(true);
    expect(RATE_LIMIT_CONTRACT.projectScoped).toBe(true);
    expect(RATE_LIMIT_CONTRACT.windowKeyed).toBe(true);
    expect(PROJECT_RATE_LIMIT_DEFAULT_MAX).toBe(100);
  });
});
