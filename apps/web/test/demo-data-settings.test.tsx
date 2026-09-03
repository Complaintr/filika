import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { DemoDataSettings } from "../src/applications/demo-data-settings";
import { renderReact } from "./helpers/render-react";

const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

describe("demo data settings", () => {
  test("loads the demo count and seeds one batch on demand", async () => {
    const calls: { method: string; url: string }[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = (init?.method ?? "GET").toUpperCase();
      calls.push({ method, url });
      if (url.endsWith("/demo") && method === "GET") return Response.json({ count: 0 });
      if (url.endsWith("/demo/seed") && method === "POST")
        return Response.json({ created: 300, count: 300 });
      return Response.json({}, { status: 404 });
    }) as typeof fetch;
    const result = await renderReact(createElement(DemoDataSettings, { appSlug: "demo-app" }));
    try {
      expect(result.container.textContent).toContain("0 demo reports");
      const load = Array.from(result.container.querySelectorAll<HTMLButtonElement>("button")).find(
        (button) => button.textContent?.includes("Load demo data"),
      );
      expect(load).not.toBeNull();
      load?.click();
      await settle();
      expect(result.container.textContent).toContain("300 sample reports added.");
      expect(result.container.textContent).toContain("300 demo reports");
      expect(calls).toContainEqual({
        method: "POST",
        url: "/api/v1/apps/demo-app/demo/seed",
      });
    } finally {
      await result.close();
      globalThis.fetch = originalFetch;
    }
  });

  test("reports when sample data already exists instead of reseeding", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = (init?.method ?? "GET").toUpperCase();
      if (url.endsWith("/demo") && method === "GET") return Response.json({ count: 300 });
      if (url.endsWith("/demo/seed") && method === "POST")
        return Response.json({ created: 0, count: 300 });
      return Response.json({}, { status: 404 });
    }) as typeof fetch;
    const result = await renderReact(createElement(DemoDataSettings, { appSlug: "demo-app" }));
    try {
      const load = Array.from(result.container.querySelectorAll<HTMLButtonElement>("button")).find(
        (button) => button.textContent?.includes("Load demo data"),
      );
      load?.click();
      await settle();
      expect(result.container.textContent).toContain(
        "Sample data already exists. Remove it first to generate a fresh batch.",
      );
      expect(result.container.textContent).toContain("300 demo reports");
    } finally {
      await result.close();
      globalThis.fetch = originalFetch;
    }
  });

  test("requires confirmation before removing demo data", async () => {
    const calls: { method: string; url: string }[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = (init?.method ?? "GET").toUpperCase();
      calls.push({ method, url });
      if (url.endsWith("/demo") && method === "GET") return Response.json({ count: 300 });
      if (url.endsWith("/demo") && method === "DELETE") return Response.json({ deleted: 300 });
      return Response.json({}, { status: 404 });
    }) as typeof fetch;
    const result = await renderReact(createElement(DemoDataSettings, { appSlug: "demo-app" }));
    try {
      const remove = Array.from(
        result.container.querySelectorAll<HTMLButtonElement>("button"),
      ).find((button) => button.textContent?.includes("Remove demo data"));
      expect(remove).not.toBeNull();
      remove?.click();
      await settle();
      expect(result.container.textContent).toContain("Confirm removal");
      expect(calls.every((call) => call.method !== "DELETE")).toBe(true);

      const confirm = Array.from(
        result.container.querySelectorAll<HTMLButtonElement>("button"),
      ).find((button) => button.textContent?.includes("Confirm removal"));
      confirm?.click();
      await settle();
      expect(result.container.textContent).toContain("300 sample reports removed.");
      expect(result.container.textContent).toContain("0 demo reports");
      expect(calls).toContainEqual({
        method: "DELETE",
        url: "/api/v1/apps/demo-app/demo",
      });
    } finally {
      await result.close();
      globalThis.fetch = originalFetch;
    }
  });

  test("shows a clear error when the demo status cannot be loaded", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => Response.json({}, { status: 500 })) as typeof fetch;
    const result = await renderReact(createElement(DemoDataSettings, { appSlug: "demo-app" }));
    try {
      await settle();
      expect(result.container.textContent).toContain(
        "The collector could not complete this request. Please try again.",
      );
    } finally {
      await result.close();
      globalThis.fetch = originalFetch;
    }
  });
});
