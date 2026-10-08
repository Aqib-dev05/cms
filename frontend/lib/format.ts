import { format, isValid, parseISO } from "date-fns";

type DateInput = string | number | Date | null | undefined;

function toDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const d = typeof value === "string" ? parseISO(value) : new Date(value);
  return isValid(d) ? d : null;
}

const EMPTY = "—";

export function formatDate(value: DateInput, pattern = "dd MMM yyyy"): string {
  const d = toDate(value);
  return d ? format(d, pattern) : EMPTY;
}

export function formatDateTime(value: DateInput): string {
  return formatDate(value, "dd MMM yyyy, hh:mm a");
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return EMPTY;
  return new Intl.NumberFormat("en-PK").format(value);
}

/** Amounts are shown as Pakistani rupees, no decimals unless needed. */
export function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return EMPTY;
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return EMPTY;
  return new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 }).format(n);
}

/** `value` is already a percentage (e.g. 82.5 → "82.5%"). */
export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return EMPTY;
  return `${value.toFixed(digits).replace(/\.0+$/, "")}%`;
}

/** "UNDER_REVIEW" → "Under Review" */
export function humanize(value: string): string {
  return value
    .toLowerCase()
    .split(/[_\s]+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/** 1.2M / 350K style, for chart axes. */
export function formatCompact(value: number): string {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

/** "2026-05" → "May" (short) or "May 2026" (long). */
export function formatMonthKey(key: string, style: "short" | "long" = "short"): string {
  const d = toDate(`${key}-01`);
  if (!d) return key;
  return format(d, style === "short" ? "MMM" : "MMMM yyyy");
}
