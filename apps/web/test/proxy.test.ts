import { describe, expect, test } from "bun:test";
import { NextRequest } from "next/server";

import { proxy } from "../proxy";

const request = (pathname: string, session = false) =>
  new NextRequest(`https://filika.test${pathname}`, {
    headers: session ? { cookie: "better-auth.session_token=test-session" } : undefined,
  });

describe("web proxy public paths", () => {
  test("allows only the explicitly listed landing assets", () => {
    for (const pathname of ["/filika-logo.svg", "/cta-bg.jpg", "/theme-bootstrap.js"]) {
      const response = proxy(request(pathname));

      expect(response.headers.get("x-middleware-next")).toBe("1");
      expect(response.headers.get("location")).toBeNull();
    }
  });

  test("serves the public demo storefront and its workspace without a session", () => {
    for (const pathname of [
      "/demo",
      "/demo/",
      "/demo/workspace",
      "/demo/workspace/fb_123",
      "/demo/anything",
    ]) {
      const response = proxy(request(pathname));

      expect(response.headers.get("x-middleware-next")).toBe("1");
      expect(response.headers.get("location")).toBeNull();
    }
  });

  test("allows the browser SDK without a session", () => {
    for (const pathname of ["/sdk/filika.js", "/sdk/filika.development.js"]) {
      const response = proxy(request(pathname));

      expect(response.headers.get("x-middleware-next")).toBe("1");
      expect(response.headers.get("location")).toBeNull();
    }
  });

  test("does not bypass authentication based on a file extension", () => {
    for (const pathname of [
      "/dashboard.js",
      "/settings.css",
      "/workspace/private.png",
      "/reports/export.svg",
    ]) {
      const response = proxy(request(pathname));

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("https://filika.test/login");
    }
  });

  test("still allows authenticated requests to protected paths", () => {
    const response = proxy(request("/workspace/private.png", true));

    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("location")).toBeNull();
  });
});
