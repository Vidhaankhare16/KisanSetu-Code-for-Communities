import { cn } from "@/lib/cn";
import { plantTint } from "./color";
import { Plant } from "./Plant";
import { cropArt } from "./profiles";

/** Each crop drawn at the moment it is most recognisable (in flower, or with ripe produce). */
const ICON_STATE: Record<string, { stage: "mid" | "late"; stageProgress: number; h: number }> = {
  default: { stage: "mid", stageProgress: 0.5, h: 26 },
  rice: { stage: "late", stageProgress: 0.6, h: 24 },
  wheat: { stage: "late", stageProgress: 0.5, h: 24 },
  barley: { stage: "late", stageProgress: 0.5, h: 24 },
  maize: { stage: "mid", stageProgress: 0.8, h: 30 },
  bajra: { stage: "late", stageProgress: 0.3, h: 28 },
  jowar: { stage: "late", stageProgress: 0.5, h: 28 },
  ragi: { stage: "late", stageProgress: 0.4, h: 22 },
  mustard: { stage: "mid", stageProgress: 0.3, h: 28 },
  sunflower: { stage: "mid", stageProgress: 0.4, h: 28 },
  cotton: { stage: "late", stageProgress: 0.6, h: 26 },
  tomato: { stage: "late", stageProgress: 0.5, h: 26 },
  onion: { stage: "mid", stageProgress: 0.8, h: 20 },
  groundnut: { stage: "mid", stageProgress: 0.3, h: 16 },
  potato: { stage: "mid", stageProgress: 0.4, h: 18 },
};

/** A small illustrated crop badge drawn with the same art as the season simulator. */
export function CropIcon({ cropId, category, className, title }: { cropId: string; category?: string; className?: string; title?: string }) {
  const art = cropArt(cropId, category);
  const state = ICON_STATE[cropId] ?? ICON_STATE.default!;
  const tint = plantTint(95, 0, state.stage, state.stageProgress * 0.4);
  return (
    <svg
      viewBox="-20 -36 40 40"
      className={cn("size-10 shrink-0", className)}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <circle cx="0" cy="-16" r="19" fill="var(--color-leaf-soft)" />
      <path d="M-17 1 Q0 -2 17 1" stroke="var(--color-soil)" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.6" />
      <Plant art={art} h={state.h} cover={0.7} stage={state.stage} stageProgress={state.stageProgress} tint={tint} seed={7} detail="low" />
    </svg>
  );
}
