import { buildWorkspace } from "./build";

await buildWorkspace();
const assets = new Map([
  ["/", "index.html"],
  ["/index.js", "index.js"],
  ["/app.css", "app.css"],
  ["/sdk/filika.development.js", "sdk/filika.development.js"],
]);

const FIXTURE_FILES = new Set(["hostile-css.html", "hostile-css-advanced.html"]);

const collector = new URL(process.env.FILIKA_COLLECTOR_ORIGIN ?? "http://localhost:8787");
if (
  !["http:", "https:"].includes(collector.protocol) ||
  collector.username ||
  collector.password ||
  collector.pathname !== "/" ||
  collector.search ||
  collector.hash
) {
  throw new Error(
    "FILIKA_COLLECTOR_ORIGIN must be an HTTP(S) origin without credentials or a path.",
  );
}
const FEEDBACK_ID = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";
const READ_API_ROUTE = new RegExp(`^/api/v1/(dashboard|inbox(?:/${FEEDBACK_ID})?)$`);
const WORKSPACE_ROUTE = new RegExp(`^/(dashboard|complaints(?:/${FEEDBACK_ID})?|settings)/?$`);

async function proxyRead(request: Request, url: URL): Promise<Response> {
  try {
    const upstream = await fetch(new URL(url.pathname + url.search, collector), {
      method: "GET",
      headers: { Accept: "application/json" },
      redirect: "error",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(8_000)]),
    });
    if (upstream.status === 404) {
      await upstream.body?.cancel();
      return new Response(null, { status: 404 });
    }
    if (!upstream.ok) {
      await upstream.body?.cancel();
      throw new Error("Collector unavailable");
    }
    return new Response(upstream.body, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return Response.json(
      { error: "Collector unavailable. Check the collector and database connection." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}

function serveAsset(path: string, contentType?: string): Response {
  const headers: Record<string, string> = {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  };
  if (contentType !== undefined) {
    headers["Content-Type"] = contentType;
  }
  return new Response(Bun.file(path), { headers });
}

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 4173,
  fetch(request) {
    if (request.method !== "GET") return new Response("Not found", { status: 404 });
    const url = new URL(request.url);
    const pathname = url.pathname;
    if (READ_API_ROUTE.test(pathname)) return proxyRead(request, url);
    if (WORKSPACE_ROUTE.test(pathname))
      return serveAsset(`${import.meta.dir}/dist/index.html`, "text/html; charset=utf-8");
    const asset = assets.get(pathname);
    if (asset !== undefined) {
      return serveAsset(`${import.meta.dir}/dist/${asset}`);
    }
    if (pathname.startsWith("/fixtures/")) {
      const name = pathname.slice("/fixtures/".length);
      if (!FIXTURE_FILES.has(name) || name.includes("/")) {
        return new Response("Not found", { status: 404 });
      }
      return serveAsset(
        `${import.meta.dir}/../../tests/e2e/fixtures/${name}`,
        "text/html; charset=utf-8",
      );
    }
    return new Response("Not found", { status: 404 });
  },
});
console.info(`Filika workspace: ${server.url}`);
