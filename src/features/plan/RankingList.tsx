"use client";

import { Droplets } from "lucide-react";
import type { RankedCropDto } from "@/contracts/api";
import { RangeBar } from "@/components/ui/RangeBar";
import { Pill } from "@/components/ui/Tone";
import { useI18n } from "@/i18n/client";
import { cropLabel } from "@/i18n/crops";
import { CropIcon } from "@/features/crops/art/CropIcon";
import { cn } from "@/lib/cn";
import { inr, inrShort, shortDate } from "@/lib/format";

const VERDICT_TONE = { recommended: "leaf", caution: "sun", not_recommended: "alert" } as const;

function riskLevel(score: number): "low" | "medium" | "high" {
  return score < 25 ? "low" : score < 50 ? "medium" : "high";
}

/**
 * Ranked crops as comparable rows: every profit bar shares one scale, so the spread between
 * a bad and a good year is visible at a glance.
 */
export function RankingList({ ranking, selectedId, onSelect }: { ranking: RankedCropDto[]; selectedId?: string; onSelect: (cropId: string) => void }) {
  const { t, lang } = useI18n();
  const lows = ranking.map((r) => r.ensemble.netProfitPerAcreInr.p10);
  const highs = ranking.map((r) => r.ensemble.netProfitPerAcreInr.p90);
  const min = Math.min(0, ...lows);
  const max = Math.max(...highs);
  const maxWater = Math.max(1, ...ranking.map((r) => r.ensemble.irrigationMm.p50));

  return (
    <div className="overflow-hidden rounded-panel border border-line bg-surface">
      <div className="hidden grid-cols-[2.2fr_3fr_1fr_0.9fr_0.9fr] gap-4 border-b border-line px-4 py-2 text-xs text-ink-soft md:grid">
        <span>{t("plan.colCrop")}</span>
        <span>{t("plan.colProfit")}</span>
        <span>{t("plan.colWater")}</span>
        <span>{t("plan.colRisk")}</span>
        <span>{t("plan.colSoil")}</span>
      </div>
      <ol>
        {ranking.map((r) => {
          const selected = r.crop.id === selectedId;
          const risk = riskLevel(r.outcome.riskScore);
          return (
            <li key={r.crop.id} className="border-b border-line last:border-0">
              <button
                type="button"
                onClick={() => onSelect(r.crop.id)}
                aria-pressed={selected}
                className={cn(
                  "grid w-full grid-cols-1 gap-3 px-4 py-4 text-left hover:bg-mist md:grid-cols-[2.2fr_3fr_1fr_0.9fr_0.9fr] md:items-center md:gap-4",
                  selected && "bg-leaf-soft/50 shadow-[inset_4px_0_0_var(--color-leaf)]",
                  r.outcome.verdict === "not_recommended" && "opacity-70",
                )}
              >
                <span className="flex items-start gap-3">
                  <span className="display w-5 pt-2 text-lg font-semibold text-ink-faint tabular">{r.rank}</span>
                  <CropIcon cropId={r.crop.id} category={r.crop.category} className="size-11" />
                  <span>
                    <span className="block text-lg font-semibold">
                      {cropLabel(t, r.crop.id, r.crop.name)}{" "}
                      <span className="text-sm font-normal text-ink-soft">{lang === "en" ? r.crop.localName : r.crop.name}</span>
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-soft">
                      <Pill tone={VERDICT_TONE[r.outcome.verdict]}>{t(`plan.verdict.${r.outcome.verdict}`)}</Pill>
                      {t("plan.harvestBy", { date: shortDate(r.harvestDate, lang) })}
                    </span>
                  </span>
                </span>
                <RangeBar
                  value={r.ensemble.netProfitPerAcreInr}
                  min={min}
                  max={max}
                  format={inrShort}
                  label={`${t("plan.colProfit")}: ${inr(r.ensemble.netProfitPerAcreInr.p10)} – ${inr(r.ensemble.netProfitPerAcreInr.p90)}`}
                />
                <span className="flex items-center gap-2 text-sm tabular">
                  <Droplets className="size-4 text-water md:hidden" aria-hidden />
                  <span className="h-1.5 w-12 rounded-full bg-water-soft">
                    <span className="block h-full rounded-full bg-water" style={{ width: `${(r.ensemble.irrigationMm.p50 / maxWater) * 100}%` }} />
                  </span>
                  {Math.round(r.ensemble.irrigationMm.p50)} mm
                </span>
                <span className="text-sm">
                  <Pill tone={risk === "low" ? "leaf" : risk === "medium" ? "sun" : "alert"}>{t(`plan.risk.${risk}`)}</Pill>
                </span>
                <span className="text-sm tabular">
                  <span className="font-semibold text-soil">{r.outcome.regenerativeScore}</span>
                  <span className="text-ink-faint">/100</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
