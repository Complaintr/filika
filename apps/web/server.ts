import { buildLocalDemo } from "./build";

await buildLocalDemo();
const assets = new Map([
  ["/", "index.html"],
  ["/index.js", "index.js"],
  ["/app.css", "app.css"],
  ["/sdk/filika.development.js", "sdk/filika.development.js"],
]);

const FIXTURE_FILES = new Set(["hostile-css.html", "hostile-css-advanced.html"]);

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
    const pathname = new URL(request.url).pathname;
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
console.info(`Filika local demo: ${server.url}`);
