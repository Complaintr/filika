import { apiRequest } from "./applications-api";

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function count(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

export interface DemoSeedResult {
  count: number;
  created: number;
}

export async function fetchDemoDataCount(appSlug: string, signal: AbortSignal): Promise<number> {
  const raw = await apiRequest(`/api/v1/apps/${encodeURIComponent(appSlug)}/demo`, signal);
  if (!record(raw) || !count(raw.count)) throw new Error("Invalid demo data status.");
  return raw.count;
}

export async function seedDemoData(appSlug: string, signal: AbortSignal): Promise<DemoSeedResult> {
  const raw = await apiRequest(
    `/api/v1/apps/${encodeURIComponent(appSlug)}/demo/seed`,
    signal,
    "POST",
  );
  if (!record(raw) || !count(raw.created) || !count(raw.count))
    throw new Error("Invalid demo seed response.");
  return { created: raw.created, count: raw.count };
}

export async function removeDemoData(appSlug: string, signal: AbortSignal): Promise<number> {
  const raw = await apiRequest(
    `/api/v1/apps/${encodeURIComponent(appSlug)}/demo`,
    signal,
    "DELETE",
  );
  if (!record(raw) || !count(raw.deleted)) throw new Error("Invalid demo removal response.");
  return raw.deleted;
}
