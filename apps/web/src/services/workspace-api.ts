import type { InboxListItemViewModel } from "../contracts/inbox-view-model";
import { readBoundedJson } from "./response";

export interface ComplaintPage {
  items: InboxListItemViewModel[];
  nextCursor: string | null;
}
export interface DashboardData {
  days: 7 | 30 | 90;
  generatedAt: string;
  total: number;
  kinds: { kind: string; count: number }[];
  daily: { date: string; count: number }[];
  routes: { label: string | null; count: number }[];
}

function record(raw: unknown): raw is Record<string, unknown> {
  return typeof raw === "object" && raw !== null && !Array.isArray(raw);
}
function shortString(raw: unknown, max: number): raw is string {
  return typeof raw === "string" && raw.length <= max;
}
function count(raw: unknown): raw is number {
  return typeof raw === "number" && Number.isSafeInteger(raw) && raw >= 0;
}
function date(raw: unknown): raw is string {
  return shortString(raw, 40) && Number.isFinite(Date.parse(raw));
}
function kind(raw: unknown): raw is string {
  return raw === "bug" || raw === "blocked_task" || raw === "confusing_behavior" || raw === "idea";
}

async function read(path: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(path, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.any([signal, AbortSignal.timeout(10_000)]),
  });
  if (response.status === 401) {
    if (typeof window !== "undefined") {
      window.location.assign("/login?force=1");
    }
  }
  if (!response.ok) throw new Error("The collector could not be reached.");
  return readBoundedJson(response);
}

export async function fetchComplaints(
  query: { search: string; kind: string; cursor: string | null },
  signal: AbortSignal,
  appSlug: string,
): Promise<ComplaintPage> {
  const params = new URLSearchParams({ limit: "25" });
  if (query.search) params.set("search", query.search.slice(0, 200));
  if (query.kind) params.set("kind", query.kind);
  if (query.cursor) params.set("cursor", query.cursor);
  const raw = await read(`/api/v1/apps/${encodeURIComponent(appSlug)}/inbox?${params}`, signal);
  if (
    !record(raw) ||
    !Array.isArray(raw.items) ||
    raw.items.length > 50 ||
    !(raw.nextCursor === null || shortString(raw.nextCursor, 200))
  )
    throw new Error("Invalid complaint page.");
  const items: InboxListItemViewModel[] = raw.items.map((item: unknown) => {
    if (
      !record(item) ||
      !shortString(item.feedbackId, 100) ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.feedbackId) ||
      !kind(item.kind) ||
      !shortString(item.title, 500) ||
      !date(item.receivedAt) ||
      !shortString(item.requestOrigin, 2048) ||
      !(item.routeLabel === null || shortString(item.routeLabel, 500))
    )
      throw new Error("Invalid complaint record.");
    return {
      feedbackId: item.feedbackId,
      kind: item.kind,
      title: item.title,
      receivedAt: item.receivedAt,
      requestOrigin: item.requestOrigin,
      routeLabel: item.routeLabel,
    };
  });
  return { items, nextCursor: raw.nextCursor };
}

export async function fetchDashboard(
  days: 7 | 30 | 90,
  signal: AbortSignal,
  appSlug: string,
): Promise<DashboardData> {
  const raw = await read(
    `/api/v1/apps/${encodeURIComponent(appSlug)}/dashboard?days=${days}`,
    signal,
  );
  if (
    !record(raw) ||
    raw.days !== days ||
    !date(raw.generatedAt) ||
    !count(raw.total) ||
    !Array.isArray(raw.kinds) ||
    raw.kinds.length > 4 ||
    !Array.isArray(raw.daily) ||
    raw.daily.length > days ||
    !Array.isArray(raw.routes) ||
    raw.routes.length > 5
  )
    throw new Error("Invalid dashboard response.");
  const kinds = raw.kinds.map((item: unknown) => {
    if (!record(item) || !kind(item.kind) || !count(item.count))
      throw new Error("Invalid type summary.");
    return { kind: item.kind, count: item.count };
  });
  const daily = raw.daily.map((item: unknown) => {
    if (
      !record(item) ||
      !date(item.date) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(item.date) ||
      !count(item.count)
    )
      throw new Error("Invalid daily summary.");
    return { date: item.date, count: item.count };
  });
  const routes = raw.routes.map((item: unknown) => {
    if (
      !record(item) ||
      !(item.label === null || shortString(item.label, 500)) ||
      !count(item.count)
    )
      throw new Error("Invalid page summary.");
    return { label: item.label, count: item.count };
  });
  return { days, generatedAt: raw.generatedAt, total: raw.total, kinds, daily, routes };
}
