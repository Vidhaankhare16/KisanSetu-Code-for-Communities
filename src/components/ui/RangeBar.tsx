import { cn } from "@/lib/cn";
import type { Percentiles } from "@/contracts/simulation";

interface RangeBarProps {
  value: Percentiles;
  /** Shared scale so rows can be compared at a glance. */
  min: number;
  max: number;
  label: string;
  format: (v: number) => string;
  className?: string;
}

/**
 * Shows uncertainty honestly: a bar from the bad-year (P10) to the good-year (P90) value
 * with a tick at the typical year (P50). Anything below zero is drawn in the loss colour.
 */
export function RangeBar({ value, min, max, label, format, className }: RangeBarProps) {
  const span = Math.max(1, max - min);
  const x = (v: number) => `${((Math.min(max, Math.max(min, v)) - min) / span) * 100}%`;
  const zero = min < 0 ? x(0) : null;
  const lossPart = value.p10 < 0;

  return (
    <div className={cn("w-full", className)} role="img" aria-label={label}>
      <div className="relative h-2.5 rounded-full bg-ink/6">
        {zero ? <div className="absolute inset-y-[-3px] w-px bg-ink-faint" style={{ left: zero }} aria-hidden /> : null}
        <div
          className={cn("absolute inset-y-0 rounded-full", lossPart ? "bg-linear-to-r from-alert/70 to-leaf/70" : "bg-leaf/60")}
          style={{ left: x(value.p10), width: `calc(${x(value.p90)} - ${x(value.p10)})` }}
        />
        <div className="absolute inset-y-[-3px] w-[3px] rounded bg-leaf-deep" style={{ left: `calc(${x(value.p50)} - 1px)` }} aria-hidden />
      </div>
      <div className="mt-1 flex justify-between text-xs text-ink-soft tabular">
        <span className={value.p10 < 0 ? "text-alert" : undefined}>{format(value.p10)}</span>
        <span className="font-semibold text-ink">{format(value.p50)}</span>
        <span>{format(value.p90)}</span>
      </div>
    </div>
  );
}
