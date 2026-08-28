import { buildLocalDemo } from "./build";

await buildLocalDemo();
const assets = new Map([
  ["/", "index.html"],
  ["/index.js", "index.js"],
  ["/app.css", "app.css"],
  ["/sdk/filika.development.js", "sdk/filika.development.js"],
]);

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 4173,
  fetch(request) {
    const asset = assets.get(new URL(request.url).pathname);
    if (request.method !== "GET" || !asset) return new Response("Not found", { status: 404 });
    return new Response(Bun.file(`${import.meta.dir}/dist/${asset}`), {
      headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
    });
  },
});
console.info(`Filika local demo: ${server.url}`);
