"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: readonly SegmentedOption<T>[];
  onChange: (value: T) => void;
  className?: string;
}

/** A radio group styled as a segmented control; arrow keys move between options natively. */
export function Segmented<T extends string>({ label, value, options, onChange, className }: SegmentedProps<T>) {
  const name = useId();
  return (
    <fieldset className={cn("min-w-0", className)}>
      <legend className="mb-2 text-sm font-medium text-ink-soft">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <label
            key={o.value}
            className={cn(
              "relative cursor-pointer rounded-control border px-3 py-2 text-sm transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-water",
              value === o.value ? "border-leaf-deep bg-leaf-soft text-leaf-deep" : "border-line bg-surface text-ink hover:border-line-strong",
            )}
          >
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="sr-only" />
            <span className="font-medium">{o.label}</span>
            {o.hint ? <span className="block text-xs text-ink-soft">{o.hint}</span> : null}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
