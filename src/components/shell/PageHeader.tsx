import type { ReactNode } from "react";
import { plantTint } from "@/features/crops/art/color";
import { Plant } from "@/features/crops/art/Plant";
import { cropArt } from "@/features/crops/art/profiles";

interface PageHeaderProps {
  title: string;
  lead: string;
  /** Crops drawn in the header's field strip. */
  crops: string[];
  children?: ReactNode;
}

/** Page title with a small illustrated strip of crops standing in a ploughed bed. */
export function PageHeader({ title, lead, crops, children }: PageHeaderProps) {
  return (
    <header className="grid items-end gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="max-w-3xl">
        <h1 className="display text-4xl font-semibold text-balance sm:text-5xl">{title}</h1>
        <p className="mt-3 text-lg text-ink-soft">{lead}</p>
        {children}
      </div>
      <FieldStrip crops={crops} />
    </header>
  );
}

const STAGES = [
  { stage: "mid" as const, sp: 0.3 },
  { stage: "late" as const, sp: 0.4 },
  { stage: "mid" as const, sp: 0.6 },
  { stage: "development" as const, sp: 0.8 },
  { stage: "mid" as const, sp: 0.5 },
];

export function FieldStrip({ crops, className }: { crops: string[]; className?: string }) {
  const step = 340 / crops.length;
  return (
    <svg viewBox="0 -96 360 118" className={className ?? "hidden w-full lg:block"} aria-hidden>
      <defs>
        <linearGradient id="strip-soil" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#a7784c" />
          <stop offset="1" stopColor="#7d5636" />
        </linearGradient>
      </defs>
      <circle cx="326" cy="-74" r="11" fill="#ffe7a3" opacity="0.9" />
      <path d="M0 0 Q180 -6 360 0 V22 H0 Z" fill="url(#strip-soil)" />
      {[6, 12, 18].map((y) => (
        <path key={y} d={`M0 ${y} Q180 ${y - 4} 360 ${y}`} stroke="#5e3d24" strokeOpacity="0.3" fill="none" />
      ))}
      {crops.map((id, i) => {
        const s = STAGES[i % STAGES.length]!;
        return (
          <g key={id} transform={`translate(${16 + step * (i + 0.5)} 0)`}>
            <Plant
              art={cropArt(id)}
              h={62 + (i % 2) * 14}
              cover={0.75}
              stage={s.stage}
              stageProgress={s.sp}
              tint={plantTint(92, 0, s.stage, s.sp * 0.5)}
              seed={i * 13 + 5}
              sway
            />
          </g>
        );
      })}
    </svg>
  );
}
