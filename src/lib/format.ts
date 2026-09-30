/** Display formatting in Indian conventions (lakh grouping, en-IN dates), per UI language. */
import type { Lang } from "@/contracts/farm";

const inrFormatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

/** ₹1,23,456 — negative values keep their sign in front of the rupee symbol. */
export function inr(value: number): string {
  const sign = value < 0 ? "−" : "";
  return `${sign}₹${inrFormatter.format(Math.abs(Math.round(value)))}`;
}

/** ₹38k / ₹1.2L — for tight spaces such as chart axes. */
export function inrShort(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  if (abs >= 100_000) return `${sign}₹${(abs / 100_000).toFixed(1)}L`;
  if (abs >= 1000) return `${sign}₹${Math.round(abs / 1000)}k`;
  return `${sign}₹${Math.round(abs)}`;
}

export function num(value: number, digits = 0): string {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value);
}

export function pct(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

/** "20 Oct" in the UI language (digits stay Latin, as on Indian government documents). */
export function shortDate(iso: string, lang: Lang = "en"): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(`${lang}-IN`, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    numberingSystem: "latn",
  });
}

export function longDate(iso: string, lang: Lang = "en"): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(`${lang}-IN`, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
    numberingSystem: "latn",
  });
}

export function todayIso(): string {
  const now = new Date();
  // India Standard Time, so "today" matches the farmer's calendar.
  return new Date(now.getTime() + 5.5 * 3600_000).toISOString().slice(0, 10);
}
