/**
 * Combined development server for the Filika web app.
 *
 * - Serves static assets from `public/` (including the SDK IIFE bundle).
 * - Delegates everything else to Bun's built-in HTML bundler for TypeScript
 *   transpilation and module resolution.
 *
 * Run: bun apps/web/dev-server.ts
 */

import { existsSync, mkdirSync, copyFileSync } from "node:fs";
import { join, extname } from "node:path";

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
  console.warn(
    "SDK bundle not found. Run 'bun run --filter @filika/sdk build' first.",
  );
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

const routes = new Bun.FileSystemRouter({
  dir: SRC_DIR,
  style: "nextjs",
});

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    let pathname = url.pathname;

    // Serve static assets from public/ first
    if (pathname !== "/") {
      const publicPath = join(PUBLIC_DIR, pathname);
      const publicFile = Bun.file(publicPath);
      if (await publicFile.exists()) {
        const ext = extname(pathname);
        const contentType = MIME_TYPES[ext] ?? "application/octet-stream";
        return new Response(publicFile, {
          headers: { "content-type": contentType },
        });
      }
    }

    // Serve the HTML app from src/ with Bun's transpiler for .ts files
    if (pathname === "/") {
      pathname = "/index.html";
    }

    const srcPath = join(SRC_DIR, pathname);
    const srcFile = Bun.file(srcPath);
    if (await srcFile.exists()) {
      const ext = extname(pathname);

      if (ext === ".ts") {
        const transpiler = new Bun.Transpiler({
          loader: "ts",
        });
        const code = await srcFile.text();
        const output = transpiler.transformSync(code);
        return new Response(output, {
          headers: { "content-type": "application/javascript; charset=utf-8" },
        });
      }

      const contentType = MIME_TYPES[ext] ?? "application/octet-stream";
      return new Response(srcFile, {
        headers: { "content-type": contentType },
      });
    }

    return new Response("Not found", { status: 404 });
  },
});

console.log(`Filika dev server running at http://localhost:${PORT}`);
