import { describe, expect, test } from "bun:test";

import type { ClientAddressResolver } from "../src/client-address";
import { windowKey } from "../src/rate-limit";
import { RATE_LIMIT_WINDOW_HOURS, windowExpiresAt, windowStartFor } from "../src/rate-limiting";

describe("atomic project rate-limit", () => {
  test("floors the window to the current hour", () => {
    expect(windowStartFor(new Date("2026-08-27T18:23:45.123Z"))).toBe("2026-08-27T18:00:00.000Z");
  });

  test("expires rate-limit identifiers at the window end", () => {
    const start = "2026-08-27T18:00:00.000Z";

    expect(windowExpiresAt(start).toISOString()).toBe("2026-08-27T19:00:00.000Z");
    expect(RATE_LIMIT_WINDOW_HOURS).toBe(1);
  });

  test("derives a stable project-scoped window key", () => {
    expect(windowKey("project-a", "2026-08-27T18:00:00.000Z")).toBe(
      "project-a:2026-08-27T18:00:00.000Z",
    );
  });

  test("exposes a provider-neutral client-address resolver interface", () => {
    const resolver: ClientAddressResolver = {
      resolveClientAddress: async () => null,
    };

    expect(typeof resolver.resolveClientAddress).toBe("function");
  });
});
