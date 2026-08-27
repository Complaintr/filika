// Local fixture only: no collector, persistence, or external service.
const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 4187,
  fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === "/")
      return new Response(Bun.file(new URL("../fixtures/sdk-core.html", import.meta.url)));
    if (path === "/filika.js")
      return new Response(
        Bun.file(new URL("../../../packages/sdk/dist/filika.js", import.meta.url)),
        { headers: { "Content-Type": "text/javascript" } },
      );
    return new Response("Not found", { status: 404 });
  },
});

console.info(`SDK core smoke fixture: ${server.url}`);
