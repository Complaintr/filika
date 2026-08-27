import { describe, expect, test } from "bun:test";

import { checkOrigin, parseOriginHeader } from "../src/origin";

describe("P2-BE-04 origin validation", () => {
  test("accepts a well-formed http origin", () => {
    expect(parseOriginHeader("http://localhost:4173")).toBe("http://localhost:4173");
  });

  test("accepts a well-formed https origin", () => {
    expect(parseOriginHeader("https://demo.example")).toBe("https://demo.example");
  });

  test("rejects a missing origin", () => {
    expect(parseOriginHeader(null)).toBeNull();
  });

  test("rejects a null origin string", () => {
    expect(parseOriginHeader("null")).toBeNull();
  });

  test("rejects malformed origins", () => {
    expect(parseOriginHeader("not-a-url")).toBeNull();
    expect(parseOriginHeader("file:///etc/passwd")).toBeNull();
    expect(parseOriginHeader("https://user:pass@demo.example")).toBeNull();
    expect(parseOriginHeader("https://demo.example/path")).toBeNull();
    expect(parseOriginHeader("https://demo.example?q=1")).toBeNull();
    expect(parseOriginHeader("https://demo.example#frag")).toBeNull();
  });

  test("rejects an origin when the header is missing on the request", () => {
    expect(
      checkOrigin(
        new Request("http://localhost:8787/api/v1/feedback", {
          method: "POST",
        }),
      ).status,
    ).toBe("rejected");
  });

  test("accepts a request with a valid origin header", () => {
    const check = checkOrigin(
      new Request("http://localhost:8787/api/v1/feedback", {
        headers: { Origin: "http://localhost:4173" },
        method: "POST",
      }),
    );

    expect(check.status).toBe("accepted");
    if (check.status === "accepted") {
      expect(check.origin).toBe("http://localhost:4173");
    }
  });
});
