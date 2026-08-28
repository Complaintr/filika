import { createDb } from "@filika/collector/db/client";
import { createFetchHandler } from "@filika/collector/handler";

export const runtime = "nodejs";

const handle = createDb(process.env.DATABASE_URL ?? "postgres://localhost:5432/filika");
const fetchHandler = createFetchHandler(handle.db);

export function GET(request: Request): Promise<Response> {
  return fetchHandler(request);
}

export function POST(request: Request): Promise<Response> {
  return fetchHandler(request);
}

export function OPTIONS(request: Request): Promise<Response> {
  return fetchHandler(request);
}
