import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";

const SPA_HTML = join(process.cwd(), "public", "index.html");

export async function GET(): Promise<Response> {
  const html = await readFile(SPA_HTML, "utf8");
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}