import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Semantic colour roles — the same hue always means the same quantity. */
export type Tone = "leaf" | "water" | "sun" | "soil" | "alert" | "neutral";

export const TONE_TEXT: Record<Tone, string> = {
  leaf: "text-leaf-deep",
  water: "text-water",
  sun: "text-[#8a5f00]",
  soil: "text-soil",
  alert: "text-alert",
  neutral: "text-ink-soft",
};

export const TONE_BG: Record<Tone, string> = {
  leaf: "bg-leaf-soft",
  water: "bg-water-soft",
  sun: "bg-sun-soft",
  soil: "bg-soil-soft",
  alert: "bg-alert-soft",
  neutral: "bg-ink/5",
};

export const TONE_FILL: Record<Tone, string> = {
  leaf: "bg-leaf",
  water: "bg-water",
  sun: "bg-sun",
  soil: "bg-soil",
  alert: "bg-alert",
  neutral: "bg-ink-faint",
};

export function Pill({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[13px] font-medium", TONE_BG[tone], TONE_TEXT[tone], className)}>
      {children}
    </span>
  );
}

export function Notice({ tone = "sun", children }: { tone?: Tone; children: ReactNode }) {
  return <p className={cn("rounded-control px-3 py-2 text-sm", TONE_BG[tone], TONE_TEXT[tone])}>{children}</p>;
}
