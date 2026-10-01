"use client";

/**
 * The crop decision at a glance: each simulated crop placed by typical-year profit against
 * irrigation needed, sized by its soil-health score and coloured by the verdict.
 * Best place to be: high and to the left.
 */
import { useState } from "react";
import type { RankedCropDto } from "@/contracts/api";
import { plantTint } from "@/features/crops/art/color";
import { Plant } from "@/features/crops/art/Plant";
import { cropArt } from "@/features/crops/art/profiles";
import { useI18n } from "@/i18n/client";
import { cropLabel } from "@/i18n/crops";
import { inr, inrShort } from "@/lib/format";
import { placeLabels } from "./labelLayout";

/** Approximate advance width of one character of the 11px label font, in chart units. */
const LABEL_CHAR_W = 6.4;
const W = 640;
const H = 300;
const PAD = { left: 56, right: 24, top: 18, bottom: 40 };
const VERDICT_COLOR = { recommended: "var(--color-leaf)", caution: "var(--color-sun)", not_recommended: "var(--color-alert)" } as const;

export function DecisionMap({ ranking, selectedId, onSelect }: { ranking: RankedCropDto[]; selectedId?: string; onSelect: (cropId: string) => void }) {
  const { t } = useI18n();
  const [hover, setHover] = useState<string | null>(null);
  const water = ranking.map((r) => r.ensemble.irrigationMm.p50);
  const profit = ranking.map((r) => r.ensemble.netProfitPerAcreInr.p50);
  const xMax = niceCeil(Math.max(100, ...water));
  const yMin = Math.min(0, niceFloor(Math.min(...profit)));
  const yMax = niceCeil(Math.max(1000, ...profit));
  const x = (v: number) => PAD.left + (v / xMax) * (W - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + (1 - (v - yMin) / (yMax - yMin)) * (H - PAD.top - PAD.bottom);
  const yTicks = ticks(yMin, yMax, 4);
  const xTicks = ticks(0, xMax, 4);
  const focus = ranking.find((r) => r.crop.id === (hover ?? selectedId));

  const points = ranking.map((r) => {
    const name = cropLabel(t, r.crop.id, r.crop.name);
    return {
      r,
      name,
      bubble: {
        id: r.crop.id,
        x: x(r.ensemble.irrigationMm.p50),
        y: y(r.ensemble.netProfitPerAcreInr.p50),
        r: 9 + (r.outcome.regenerativeScore / 100) * 12,
        width: name.length * LABEL_CHAR_W + 4,
        height: 12,
      },
    };
  });
  const labels = placeLabels(
    points.map((p) => p.bubble),
    { x0: PAD.left, y0: 0, x1: W, y1: H - PAD.bottom },
  );
  // The selected or hovered crop is drawn last so it sits on top of its neighbours.
  const drawOrder = [...points].sort((a, b) => Number(a.r.crop.id === (hover ?? selectedId)) - Number(b.r.crop.id === (hover ?? selectedId)));

  return (
    <figure className="rounded-panel border border-line bg-surface p-4">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-semibold">{t("plan.mapTitle")}</span>
        <span className="text-xs text-ink-soft">{t("plan.mapLead")}</span>
      </figcaption>
      {/* Below ~34rem the chart scrolls sideways rather than shrinking its labels to nothing. */}
      <div className="-mx-4 mt-2 overflow-x-auto px-4">
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full min-w-[34rem]" role="img" aria-label={t("plan.mapTitle")}>
          <rect
            x={PAD.left}
            y={PAD.top}
            width={(W - PAD.left - PAD.right) * 0.5}
            height={(H - PAD.top - PAD.bottom) * 0.5}
            fill="var(--color-leaf-soft)"
            opacity="0.6"
          />
          <text x={PAD.left + 8} y={PAD.top + 16} fontSize="11" fill="var(--color-leaf-deep)">
            {t("plan.mapSweetSpot")}
          </text>
          {yTicks.map((v) => (
            <g key={`y${v}`}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke={v === 0 ? "var(--color-ink-faint)" : "var(--color-line)"} />
              <text x={PAD.left - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--color-ink-soft)">
                {inrShort(v)}
              </text>
            </g>
          ))}
          {xTicks.map((v) => (
            <text key={`x${v}`} x={x(v)} y={H - PAD.bottom + 16} textAnchor="middle" fontSize="11" fill="var(--color-ink-soft)">
              {v} mm
            </text>
          ))}
          <text x={(W + PAD.left) / 2} y={H - 4} textAnchor="middle" fontSize="11" fill="var(--color-ink-soft)">
            {t("plan.mapX")}
          </text>
          <text transform={`translate(12 ${(H - PAD.bottom + PAD.top) / 2}) rotate(-90)`} textAnchor="middle" fontSize="11" fill="var(--color-ink-soft)">
            {t("plan.mapY")}
          </text>

          {drawOrder.map(({ r, name, bubble }) => {
            const { x: cx, y: cy, r: radius } = bubble;
            const active = r.crop.id === selectedId || r.crop.id === hover;
            const art = cropArt(r.crop.id, r.crop.category);
            return (
              <g
                key={r.crop.id}
                transform={`translate(${cx} ${cy})`}
                className="cursor-pointer"
                onMouseEnter={() => setHover(r.crop.id)}
                onMouseLeave={() => setHover(null)}
                onClick={() => onSelect(r.crop.id)}
                role="button"
                tabIndex={0}
                aria-label={`${name}: ${inr(r.ensemble.netProfitPerAcreInr.p50)}, ${Math.round(r.ensemble.irrigationMm.p50)} mm`}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(r.crop.id)}
              >
                {/* Bad-year to good-year profit whisker */}
                <line
                  x1="0"
                  x2="0"
                  y1={y(r.ensemble.netProfitPerAcreInr.p10) - cy}
                  y2={y(r.ensemble.netProfitPerAcreInr.p90) - cy}
                  stroke={VERDICT_COLOR[r.outcome.verdict]}
                  strokeWidth="2"
                  opacity="0.45"
                />
                <circle r={radius} fill="var(--color-surface)" stroke={VERDICT_COLOR[r.outcome.verdict]} strokeWidth={active ? 3.5 : 2} />
                <g transform={`translate(0 ${radius * 0.62}) scale(${radius / 26})`}>
                  <Plant art={art} h={30} cover={0.7} stage="mid" stageProgress={0.6} tint={plantTint(95, 0, "mid", 0.6)} seed={3} detail="low" />
                </g>
              </g>
            );
          })}

          <g aria-hidden className="pointer-events-none">
            {labels.map((l, i) => {
              const active = l.id === selectedId || l.id === hover;
              return (
                <text
                  key={l.id}
                  x={l.x}
                  y={l.y}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight={active ? 700 : 500}
                  fill="var(--color-ink)"
                  stroke="var(--color-surface)"
                  strokeWidth="3"
                  paintOrder="stroke"
                >
                  {points[i]!.name}
                </text>
              );
            })}
          </g>
        </svg>
      </div>
      {focus ? (
        <p className="mt-1 text-sm text-ink-soft tabular">
          <span className="font-semibold text-ink">{points.find((p) => p.r === focus)!.name}</span> ·{" "}
          {t("sim.range", { low: inr(focus.ensemble.netProfitPerAcreInr.p10), high: inr(focus.ensemble.netProfitPerAcreInr.p90) })} ·{" "}
          {Math.round(focus.ensemble.irrigationMm.p50)} mm · {t("sim.regen")} {focus.outcome.regenerativeScore}/100
        </p>
      ) : (
        <p className="mt-1 text-xs text-ink-faint">{t("plan.mapHint")}</p>
      )}
    </figure>
  );
}

function niceCeil(v: number): number {
  const step = 10 ** Math.floor(Math.log10(Math.abs(v) || 1));
  return Math.ceil(v / step) * step;
}

function niceFloor(v: number): number {
  if (v >= 0) return 0;
  return -niceCeil(-v);
}

function ticks(min: number, max: number, n: number): number[] {
  const step = (max - min) / n;
  return Array.from({ length: n + 1 }, (_, i) => Math.round(min + i * step));
}
