/** Calendar helpers on ISO `YYYY-MM-DD` strings, evaluated in UTC to stay timezone-proof. */

const DAY_MS = 86_400_000;

export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) throw new Error(`Invalid ISO date: ${iso}`);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  return toIsoDate(new Date(parseIsoDate(iso).getTime() + days * DAY_MS));
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((parseIsoDate(toIso).getTime() - parseIsoDate(fromIso).getTime()) / DAY_MS);
}

/** Day of year, 1..366. */
export function dayOfYear(iso: string): number {
  const date = parseIsoDate(iso);
  const start = Date.UTC(date.getUTCFullYear(), 0, 1);
  return Math.floor((date.getTime() - start) / DAY_MS) + 1;
}

/** Month-day key (`MM-DD`) used to align historical years with a future season. */
export function monthDay(iso: string): string {
  return iso.slice(5, 10);
}

/** Same month/day in another year; 29 Feb maps to 28 Feb in non-leap years. */
export function withYear(iso: string, year: number): string {
  const md = monthDay(iso);
  if (md === "02-29" && !isLeapYear(year)) return `${year}-02-28`;
  return `${year}-${md}`;
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Signed distance in days from `iso` to a month/day window (0 when inside).
 * Windows may wrap the new year (e.g. 15 Dec → 31 Jan).
 */
export function distanceToWindow(iso: string, from: { month: number; day: number }, to: { month: number; day: number }): number {
  const date = parseIsoDate(iso);
  const year = date.getUTCFullYear();
  let best = Number.POSITIVE_INFINITY;
  // Test the window anchored in the previous, current and next year to handle wrap-around.
  for (const y of [year - 1, year, year + 1]) {
    const start = Date.UTC(y, from.month - 1, from.day);
    const endYear = to.month < from.month ? y + 1 : y;
    const end = Date.UTC(endYear, to.month - 1, to.day);
    const t = date.getTime();
    if (t >= start && t <= end) return 0;
    const d = t < start ? (start - t) / DAY_MS : (t - end) / DAY_MS;
    best = Math.min(best, Math.round(d));
  }
  return best;
}

export function formatShortDate(iso: string): string {
  return parseIsoDate(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
}
