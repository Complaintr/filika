import { describe, expect, test } from "bun:test";

import {
  DEMO_ALLOWED_ORIGINS,
  DEMO_PROJECT_DISPLAY_NAME,
  DEMO_PROJECT_KEY,
  DEMO_RETENTION_HOURS,
} from "../src/db/seed";

describe("seed data", () => {
  test("seeds one demo project", () => {
    expect(DEMO_PROJECT_KEY).toBe("filika-demo");
    expect(DEMO_PROJECT_DISPLAY_NAME).toBe("Filika Demo");
  });

  test("uses the 24-hour retention window", () => {
    expect(DEMO_RETENTION_HOURS).toBe(24);
  });

  test("allows the documented localhost origins", () => {
    expect(DEMO_ALLOWED_ORIGINS).toEqual(["http://localhost:4173", "http://127.0.0.1:4173"]);
  });
});
