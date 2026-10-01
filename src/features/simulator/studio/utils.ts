import { MONTHS } from "@/lib/months";
import type { Severity } from "./types";

/** ₹1,23,456 */
export function formatRupees(amount: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

/** 1,23,456.7 */
export function formatIndianNumber(num: number): string {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 }).format(num);
}

/** "20 Oct" from an ISO date, in the language of `months` (the labels' month names). */
export function formatDate(isoDate: string, months: readonly string[] = MONTHS.en.short): string {
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return isoDate;
  return `${Number(day)} ${months[Number(month) - 1] ?? month}`;
}

/** Severity colours, following the app's rule: only critical items use the alert hue. */
export function getSeverityStyle(severity: Severity) {
  switch (severity) {
    case "critical":
      return {
        badgeBg: "bg-alert-soft text-alert border-alert/40",
        border: "border-alert/40",
        text: "text-alert",
        solidBg: "bg-alert",
        dotColor: "var(--color-alert)",
        panel: "border-alert/40 bg-alert-soft/50",
        icon: "bg-alert-soft text-alert",
      };
    case "warning":
      return {
        badgeBg: "bg-sun-soft text-[#8a5f00] border-sun/40",
        border: "border-sun/40",
        text: "text-[#8a5f00]",
        solidBg: "bg-sun",
        dotColor: "var(--color-sun)",
        panel: "border-sun/40 bg-sun-soft/50",
        icon: "bg-sun-soft text-[#8a5f00]",
      };
    default:
      return {
        badgeBg: "bg-water-soft text-water border-water/40",
        border: "border-water/40",
        text: "text-water",
        solidBg: "bg-water",
        dotColor: "var(--color-water)",
        panel: "border-line bg-surface",
        icon: "bg-leaf-soft text-leaf-deep",
      };
  }
}
