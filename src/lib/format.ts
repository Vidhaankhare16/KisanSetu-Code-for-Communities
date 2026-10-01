/** Display formatting in Indian conventions (lakh grouping, en-IN dates), per UI language. */
import type { Lang } from "@/contracts/farm";
import { MONTHS } from "./months";

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

/**
 * Dates are composed as "day month [year]" from a fixed month table, so the server and every
 * browser render identical text (their ICU data differs in order and spelling, which would
 * break hydration). Digits stay Latin, as on Indian government documents.
 */
function datePart(iso: string, lang: Lang, month: "short" | "long", withYear: boolean): string {
  const [year, m, day] = iso.split("-").map(Number) as [number, number, number];
  const name = (MONTHS[lang] ?? MONTHS.en)[month][m - 1];
  return withYear ? `${day} ${name} ${year}` : `${day} ${name}`;
}

/** "20 Oct" in the UI language. */
export function shortDate(iso: string, lang: Lang = "en"): string {
  return datePart(iso, lang, "short", false);
}

/** "20 October 2026" in the UI language. */
export function longDate(iso: string, lang: Lang = "en"): string {
  return datePart(iso, lang, "long", true);
}

export function todayIso(): string {
  const now = new Date();
  // India Standard Time, so "today" matches the farmer's calendar.
  return new Date(now.getTime() + 5.5 * 3600_000).toISOString().slice(0, 10);
}
