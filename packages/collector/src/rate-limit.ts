export const PROJECT_RATE_LIMIT_DEFAULT_MAX = 100 as const;

export const RATE_LIMIT_CONTRACT = {
  atomic: true,
  durable: true,
  projectScoped: true,
  windowKeyed: true,
} as const;

export interface RateLimitDecision {
  allowed: boolean;
  nextCount: number;
}

export function evaluateWindow(currentCount: number, maxPerWindow: number): RateLimitDecision {
  if (currentCount >= maxPerWindow) {
    return { allowed: false, nextCount: currentCount };
  }

  return { allowed: true, nextCount: currentCount + 1 };
}

export function windowKey(projectId: string, windowStart: string): string {
  return `${projectId}:${windowStart}`;
}
