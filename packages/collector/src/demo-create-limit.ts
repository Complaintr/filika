export interface DemoCreationLimiter {
  /** Returns true when the client may create one more demo project now. */
  allow(clientKey: string, now?: Date): boolean;
}

export interface DemoCreationLimiterOptions {
  maxPerWindow: number;
  windowMs: number;
}

/**
 * In-memory per-client cap on unauthenticated demo project creation. The
 * demo factory is public, so the global project cap alone does not stop a
 * scripted client from creating thousands of device projects. A fixed
 * per-client hourly budget slows that abuse without a schema change. The
 * window lives in the server process; multi-instance deployments share the
 * Postgres-backed project cap but not this counter, so operators should
 * treat it as a first line of defense, not a hard isolation boundary.
 */
export function createDemoCreationLimiter(
  options: DemoCreationLimiterOptions,
): DemoCreationLimiter {
  const windows = new Map<string, { start: number; count: number }>();

  return {
    allow(clientKey: string, now: Date = new Date()): boolean {
      const time = now.getTime();
      const entry = windows.get(clientKey);

      if (entry === undefined || time - entry.start >= options.windowMs) {
        windows.set(clientKey, { start: time, count: 1 });
        return true;
      }

      if (entry.count >= options.maxPerWindow) {
        return false;
      }

      entry.count += 1;
      return true;
    },
  };
}

export const DEMO_CREATION_LIMITS = {
  maxPerWindow: 20,
  windowMs: 3_600_000,
} as const;

/**
 * Best-effort client identity for the demo creation budget. Requests without
 * a resolvable proxy address share one bucket, which also caps clients that
 * hide their address.
 */
export function demoClientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded !== null) {
    const first = forwarded.split(",")[0]?.trim();
    if (first !== undefined && first.length > 0) return first;
  }
  const cloudflare = request.headers.get("cf-connecting-ip");
  if (cloudflare !== null && cloudflare.length > 0) return cloudflare;
  return "unknown";
}

export const demoCreationLimiter: DemoCreationLimiter =
  createDemoCreationLimiter(DEMO_CREATION_LIMITS);
