import { describe, expect, test } from "bun:test";

import { ERROR_CATEGORY_STATUS, rejectionResponse } from "../src/errors";

describe("P2-BE-04 rejection responses", () => {
  test("maps every error category to a bounded status", () => {
    expect(ERROR_CATEGORY_STATUS.invalid_input).toBe(400);
    expect(ERROR_CATEGORY_STATUS.denied_origin).toBe(403);
    expect(ERROR_CATEGORY_STATUS.payload_too_large).toBe(413);
    expect(ERROR_CATEGORY_STATUS.project_not_found).toBe(400);
    expect(ERROR_CATEGORY_STATUS.internal_error).toBe(500);
  });

  test("returns a closed error body without free text", async () => {
    const response = rejectionResponse("denied_origin");

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: { category: "denied_origin" } });
  });
});
