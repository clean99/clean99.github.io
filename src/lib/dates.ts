import type { Lang } from "./i18n";

/**
 * Post dates are authored as naive wall-clock times in the author's timezone
 * (`2026-07-02 17:30:00`). They are stored as UTC instants whose UTC fields equal
 * the authored fields, so URL segments never depend on the build machine's TZ.
 */
const NAIVE_DATE = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/;

export function parseNaiveDate(value: unknown): Date {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) throw new Error("Invalid date");
    return value;
  }
  if (typeof value !== "string") throw new Error(`Unsupported date value: ${String(value)}`);
  const trimmed = value.trim();
  const match = NAIVE_DATE.exec(trimmed);
  if (!match) {
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) throw new Error(`Invalid date: ${value}`);
    return parsed;
  }
  const [, y, mo, d, h = "0", mi = "0", s = "0"] = match;
  return new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s)));
}

const pad = (n: number) => String(n).padStart(2, "0");

export function dateParts(date: Date) {
  return {
    year: String(date.getUTCFullYear()),
    month: pad(date.getUTCMonth() + 1),
    day: pad(date.getUTCDate())
  };
}

/** ISO 8601 with the author's offset, e.g. `2026-07-02T17:30:00+08:00`. */
export function toIsoWithOffset(date: Date, offset = "+08:00"): string {
  const { year, month, day } = dateParts(date);
  return `${year}-${month}-${day}T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(
    date.getUTCSeconds()
  )}${offset}`;
}

/** Absolute instant for feeds and sitemaps (RFC 3339 in UTC). */
export function toInstant(date: Date, offset = "+08:00"): string {
  return new Date(toIsoWithOffset(date, offset)).toISOString();
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

export function formatLongDate(date: Date, lang: Lang): string {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const d = date.getUTCDate();
  if (lang === "zh") return `${y} 年 ${m + 1} 月 ${d} 日`;
  return `${MONTHS[m]} ${d}, ${y}`;
}

/** Compact ledger date: `2026.07.02`. */
export function formatShortDate(date: Date): string {
  const { year, month, day } = dateParts(date);
  return `${year}.${month}.${day}`;
}

/** Month + day for year-grouped lists: `Jul 02` / `07-02`. */
export function formatMonthDay(date: Date, lang: Lang): string {
  const { month, day } = dateParts(date);
  if (lang === "zh") return `${month}-${day}`;
  return `${MONTHS[date.getUTCMonth()]!.slice(0, 3)} ${day}`;
}
