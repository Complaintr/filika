/**
 * Combined development server for the Filika web app.
 *
 * - Serves static assets from `public/` (including the SDK IIFE bundle).
 * - Delegates everything else to Bun's built-in HTML bundler for TypeScript
 *   transpilation and module resolution.
 *
 * Run: bun apps/web/dev-server.ts
 */

import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { extname, join } from "node:path";

const PORT = Number(process.env.PORT ?? 4173);
const WEB_ROOT = import.meta.dir;
const PUBLIC_DIR = join(WEB_ROOT, "public");
const SRC_DIR = join(WEB_ROOT, "src");

// Copy SDK bundle before starting
const sdkSource = join(WEB_ROOT, "../../packages/sdk/dist/filika.js");
const sdkDest = join(PUBLIC_DIR, "filika.js");
if (!existsSync(PUBLIC_DIR)) {
  mkdirSync(PUBLIC_DIR, { recursive: true });
}
if (existsSync(sdkSource)) {
  copyFileSync(sdkSource, sdkDest);
  console.log("SDK bundle copied to public/filika.js");
} else {
  console.warn("SDK bundle not found. Run 'bun run --filter @filika/sdk build' first.");
}

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    let pathname = url.pathname;

    // Handle SDK script asset requests
    if (
      pathname === "/filika.js" ||
      pathname === "/public/filika.js" ||
      pathname.endsWith("/filika.js")
    ) {
      const sdkFile = Bun.file(sdkDest);
      if (await sdkFile.exists()) {
        return new Response(sdkFile, {
          headers: { "content-type": "application/javascript; charset=utf-8" },
        });
      }
    }

    // Serve static assets from public/
    if (pathname.startsWith("/public/")) {
      const publicPath = join(PUBLIC_DIR, pathname.replace(/^\/public\//, ""));
      const publicFile = Bun.file(publicPath);
      if (await publicFile.exists()) {
        const ext = extname(publicPath);
        const contentType = MIME_TYPES[ext] ?? "application/octet-stream";
        return new Response(publicFile, {
          headers: { "content-type": contentType },
        });
      }
    }

    // Bundle TypeScript entry point on-the-fly for browser execution
    if (
      pathname === "/index.ts" ||
      pathname === "/src/index.ts" ||
      pathname === "/index.js" ||
      pathname.endsWith("/index.ts")
    ) {
      const buildResult = await Bun.build({
        entrypoints: [join(SRC_DIR, "index.ts")],
        target: "browser",
      });

      if (buildResult.success && buildResult.outputs[0]) {
        const bundledJs = await buildResult.outputs[0].text();
        return new Response(bundledJs, {
          headers: { "content-type": "application/javascript; charset=utf-8" },
        });
      }

      console.error("Bun.build dev error:", buildResult.logs);
      return new Response("console.error('Failed to bundle index.ts');", {
        headers: { "content-type": "application/javascript; charset=utf-8" },
        status: 500,
      });
    }

    // Serve index.html
    if (pathname === "/" || pathname === "/index.html") {
      const htmlFile = Bun.file(join(SRC_DIR, "index.html"));
      return new Response(htmlFile, {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    // Serve any other static asset from src/
    const srcPath = join(SRC_DIR, pathname);
    const srcFile = Bun.file(srcPath);
    if (await srcFile.exists()) {
      const ext = extname(pathname);
      const contentType = MIME_TYPES[ext] ?? "application/octet-stream";
      return new Response(srcFile, {
        headers: { "content-type": contentType },
      });
    }

    return new Response("Not found", { status: 404 });
  },
});

console.log(`Filika dev server running at http://localhost:${PORT}`);
