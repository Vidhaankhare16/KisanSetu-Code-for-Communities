"use client";

import { useMemo, useState } from "react";
import type { SimulationResult } from "@/contracts/simulation";
import { useI18n } from "@/i18n/client";
import { shortDate } from "@/lib/format";

const W = 1000;
const RAIN_H = 64;
const CROP_TOP = 76;
const CROP_H = 150;
const SOIL_TOP = 244;
const SOIL_H = 56;
const H = SOIL_TOP + SOIL_H;

/**
 * A whole simulated season in one picture: rain and irrigation falling from the top, the
 * crop canopy growing (turning gold as it ripens), and root-zone soil moisture beneath.
 * It draws itself left to right once on load; pointing at any day shows that day's values.
 */
export function SeasonRibbon({ simulation, caption }: { simulation: SimulationResult; caption: string }) {
  const { t, lang } = useI18n();
  const { days, stages } = simulation;
  const n = days.length;
  const [hover, setHover] = useState<number | null>(null);
  const x = (i: number) => (i / Math.max(1, n - 1)) * W;

  const paths = useMemo(() => {
    const canopy = days.map((d, i) => `${x(i)},${CROP_TOP + CROP_H * (1 - d.canopyCover)}`).join(" L");
    const soil = days.map((d, i) => `${x(i)},${SOIL_TOP + SOIL_H * (1 - d.soilMoisturePct / 100)}`).join(" L");
    return {
      canopy: `M0,${CROP_TOP + CROP_H} L${canopy} L${W},${CROP_TOP + CROP_H} Z`,
      soilLine: `M${soil}`,
      soilArea: `M0,${H} L${soil} L${W},${H} Z`,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const late = stages.find((s) => s.key === "late");
  const lateStart = late ? late.startDay / Math.max(1, n - 1) : 1;
  const months = useMemo(() => monthTicks(days.map((d) => d.date)), [days]);
  const markers = simulation.events.filter((e) => e.severity !== "info" || e.type === "harvest");
  const hovered = hover !== null ? days[hover] : undefined;

  return (
    <figure className="relative">
      <div
        className="relative overflow-hidden rounded-panel border border-line bg-surface"
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setHover(Math.round(((e.clientX - r.left) / r.width) * (n - 1)));
        }}
        onPointerLeave={() => setHover(null)}
      >
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block h-64 w-full sm:h-80" role="img" aria-label={caption}>
          <defs>
            <linearGradient id="ribbon-crop" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="var(--color-leaf)" />
              <stop offset={Math.max(0, lateStart - 0.02)} stopColor="var(--color-leaf-deep)" />
              <stop offset={Math.min(1, lateStart + 0.12)} stopColor="var(--color-sun)" />
            </linearGradient>
            <pattern id="ribbon-irrigation" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="6" height="6" fill="var(--color-water-soft)" />
              <rect width="2.5" height="6" fill="var(--color-water)" />
            </pattern>
            <clipPath id="ribbon-reveal">
              <rect x="0" y="0" height={H} width={W} className="reveal-x" />
            </clipPath>
          </defs>

          <g clipPath="url(#ribbon-reveal)">
            {days.map((d, i) =>
              d.rainMm > 0.5 ? (
                <rect key={`r${i}`} x={x(i) - 1.6} y={0} width={3.2} height={Math.min(RAIN_H, 6 + d.rainMm * 2)} fill="var(--color-water)" opacity={0.75} />
              ) : null,
            )}
            {days.map((d, i) =>
              d.irrigationMm > 0 ? (
                <rect key={`i${i}`} x={x(i) - 5} y={0} width={10} height={Math.min(RAIN_H, 10 + d.irrigationMm * 0.6)} fill="url(#ribbon-irrigation)" />
              ) : null,
            )}
            <path d={paths.canopy} fill="url(#ribbon-crop)" opacity={0.9} />
            <path d={paths.soilArea} fill="var(--color-soil-soft)" />
            <path d={paths.soilLine} fill="none" stroke="var(--color-water)" strokeWidth={2.5} vectorEffect="non-scaling-stroke" />
          </g>
          <line x1={0} x2={W} y1={SOIL_TOP} y2={SOIL_TOP} stroke="var(--color-soil)" strokeOpacity={0.35} vectorEffect="non-scaling-stroke" />
          {hover !== null ? (
            <line x1={x(hover)} x2={x(hover)} y1={0} y2={H} stroke="var(--color-ink)" strokeOpacity={0.5} vectorEffect="non-scaling-stroke" />
          ) : null}
        </svg>

        {markers.map((e) => (
          <span
            key={`${e.type}-${e.day}`}
            title={e.title}
            className="pointer-events-none absolute top-[22%] size-2.5 -translate-x-1/2 rounded-full ring-2 ring-surface"
            style={{ left: `${(e.day / (n - 1)) * 100}%`, background: markerColor(e.type, e.severity) }}
          />
        ))}

        {hovered ? (
          <div
            className="pointer-events-none absolute top-3 z-10 w-48 rounded-control border border-line bg-surface/95 p-3 text-sm shadow-md"
            style={{ left: `clamp(0.5rem, calc(${(hover! / (n - 1)) * 100}% - 6rem), calc(100% - 12.5rem))` }}
          >
            <p className="font-semibold">{shortDate(hovered.date, lang)}</p>
            <dl className="mt-1 grid grid-cols-[1fr_auto] gap-x-3 text-ink-soft tabular">
              <dt>{t("landing.ribbonLegendCanopy")}</dt>
              <dd className="text-leaf-deep">{Math.round(hovered.canopyCover * 100)}%</dd>
              <dt>{t("landing.ribbonLegendMoisture")}</dt>
              <dd className="text-water">{Math.round(hovered.soilMoisturePct)}%</dd>
              <dt>{t("landing.ribbonLegendRain")}</dt>
              <dd>{hovered.rainMm.toFixed(1)} mm</dd>
            </dl>
          </div>
        ) : null}
      </div>

      {/* Growth stages as a strip under the chart, so labels never sit on the artwork. */}
      <div className="mt-1.5 flex h-6 overflow-hidden rounded text-[11px] text-ink" aria-hidden>
        {stages.map((s) => (
          <span
            key={s.key}
            className={`truncate px-1.5 leading-6 ${STAGE_BG[s.key]}`}
            style={{ width: `${((s.endDay - s.startDay + 1) / n) * 100}%` }}
            title={s.label}
          >
            {s.label}
          </span>
        ))}
      </div>

      <div className="relative mt-1.5 h-5 text-xs text-ink-soft" aria-hidden>
        {months.map((m) => (
          <span key={m.index} className="absolute" style={{ left: `${(m.index / n) * 100}%` }}>
            {shortDate(m.date, lang).replace(/^\d+\s*/, "")}
          </span>
        ))}
      </div>

      <figcaption className="mt-3 text-sm text-ink-soft">
        <span className="block text-ink">{caption}</span>
        <span className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2">
          <Legend swatch="bg-water" label={t("landing.ribbonLegendRain")} />
          <Legend swatch="bg-[repeating-linear-gradient(45deg,var(--color-water)_0_2px,var(--color-water-soft)_2px_5px)]" label={t("landing.ribbonLegendIrrigation")} />
          <Legend swatch="bg-leaf" label={t("landing.ribbonLegendCanopy")} />
          <Legend swatch="bg-soil-soft ring-1 ring-water" label={t("landing.ribbonLegendMoisture")} />
          <Legend swatch="rounded-full bg-soil" label={t("landing.ribbonLegendRisk")} />
        </span>
      </figcaption>
    </figure>
  );
}

const STAGE_BG = { initial: "bg-leaf-soft", development: "bg-leaf/35", mid: "bg-leaf/60", late: "bg-sun/55" } as const;

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block size-3 rounded-sm ${swatch}`} aria-hidden />
      {label}
    </span>
  );
}

function markerColor(type: string, severity: string): string {
  if (type === "harvest") return "var(--color-sun)";
  if (type === "heat_stress") return "var(--color-sun)";
  if (type === "dry_spell" || type === "heavy_rain") return "var(--color-water)";
  return severity === "critical" ? "var(--color-alert)" : "var(--color-soil)";
}

function monthTicks(dates: string[]): { index: number; date: string }[] {
  const ticks: { index: number; date: string }[] = [];
  dates.forEach((d, i) => {
    if (d.endsWith("-01") || (i === 0 && Number(d.slice(8)) < 10)) ticks.push({ index: i, date: d });
  });
  return ticks;
}
