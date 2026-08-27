export const CLEANUP_COMMAND_NAME = "db:cleanup" as const;

export const CLEANUP_CONTRACT = {
  deletesExpiredFeedback: true,
  deletesExpiredRateLimitIdentifiers: true,
  idempotent: true,
  neverDeletesProjects: true,
  singleTransactionalPass: true,
} as const;

const HOUR_MS = 60 * 60 * 1000;

export function hasFeedbackExpired(
  receiptTimestamp: Date,
  now: Date,
  retentionHours: number,
): boolean {
  return now.getTime() >= receiptTimestamp.getTime() + retentionHours * HOUR_MS;
}

export function hasRateLimitExpired(expiresAt: Date, now: Date): boolean {
  return now.getTime() >= expiresAt.getTime();
}

export function selectExpiredFeedback<T extends { receiptTimestamp: Date }>(
  rows: readonly T[],
  now: Date,
  retentionHours: number,
): T[] {
  return rows.filter((row) => hasFeedbackExpired(row.receiptTimestamp, now, retentionHours));
}

export function selectExpiredRateLimits<T extends { expiresAt: Date }>(
  rows: readonly T[],
  now: Date,
): T[] {
  return rows.filter((row) => hasRateLimitExpired(row.expiresAt, now));
}
