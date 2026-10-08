/** Same threshold as the attendance module's `isAtRisk`. */
export const AT_RISK_THRESHOLD = 75;
export const AT_RISK_WINDOW_DAYS = 90;
/** Ignore students with only a handful of records — one absence would otherwise flag them. */
export const AT_RISK_MIN_RECORDS = 5;

/**
 * The college runs on Pakistan time (UTC+5, no DST). Timestamps (paidAt, issuedAt)
 * are bucketed by local month so a payment at 1am on the 1st lands in the right month.
 */
const COLLEGE_UTC_OFFSET_MS = 5 * 60 * 60 * 1000;

const pad = (n: number) => String(n).padStart(2, "0");

function localParts(d: Date): { year: number; month: number } {
  const shifted = new Date(d.getTime() + COLLEGE_UTC_OFFSET_MS);
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() };
}

/** Month key for a real timestamp, in college-local time. */
export function monthKeyLocal(d: Date): string {
  const { year, month } = localParts(d);
  return `${year}-${pad(month + 1)}`;
}

/** Month key for `@db.Date` columns (stored as UTC midnight, no timezone shift). */
export function monthKeyUtc(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

/** Oldest → newest list of `months` month keys ending at the current local month. */
export function buildMonthKeys(months: number, now: Date): string[] {
  const { year, month } = localParts(now);
  const current = year * 12 + month;
  const keys: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const idx = current - i;
    keys.push(`${Math.floor(idx / 12)}-${pad((idx % 12) + 1)}`);
  }
  return keys;
}

/** Instant at which local month `offset` months from now begins (0 = this month, 1 = next month). */
export function localMonthStart(now: Date, offset = 0): Date {
  const { year, month } = localParts(now);
  return new Date(Date.UTC(year, month + offset, 1) - COLLEGE_UTC_OFFSET_MS);
}

/** Same boundary for `@db.Date` columns (UTC midnight). */
export function dateOnlyMonthStart(now: Date, offset = 0): Date {
  const { year, month } = localParts(now);
  return new Date(Date.UTC(year, month + offset, 1));
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Attendance rate in %, 1 decimal. `null` when there is nothing to measure. */
export function attendanceRate(attended: number, total: number): number | null {
  if (total <= 0) return null;
  return round1((attended / total) * 100);
}

export interface StatusCount {
  status: string;
  count: number;
}

/** Attended = PRESENT or LATE (same rule as the attendance module). */
export function summariseAttendance(counts: StatusCount[]): { attended: number; total: number } {
  let attended = 0;
  let total = 0;
  for (const c of counts) {
    total += c.count;
    if (c.status === "PRESENT" || c.status === "LATE") attended += c.count;
  }
  return { attended, total };
}

/** Parse `?months=` — default 6, clamped to 1..12. */
export function parseMonths(value: unknown, fallback = 6): number {
  const n = Number.parseInt(String(value ?? ""), 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(12, Math.max(1, n));
}
