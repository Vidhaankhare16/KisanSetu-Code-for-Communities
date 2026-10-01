"use client";

import { useState } from "react";
import type { CropCategory } from "@/contracts/simulation";
import type { OutlookDistrict } from "@/contracts/network";
import { useI18n } from "@/i18n/client";
import { inr } from "@/lib/format";
import { cropColor } from "./cropColors";

const LON = [67, 98] as const;
const LAT = [6, 37] as const;
const W = 620;
const H = 640;

const project = (lat: number, lon: number) => ({
  x: ((lon - LON[0]) / (LON[1] - LON[0])) * W,
  y: ((LAT[1] - lat) / (LAT[1] - LAT[0])) * H,
});

/**
 * District headquarters plotted on a latitude/longitude grid, coloured by the crop family
 * of each district's best rabi crop. No boundaries are drawn.
 */
export function OutlookMap({
  districts,
  categoryOf,
  nameOf,
}: {
  districts: OutlookDistrict[];
  categoryOf: Record<string, CropCategory>;
  nameOf: Record<string, string>;
}) {
  const { t } = useI18n();
  const [active, setActive] = useState<OutlookDistrict | null>(null);

  return (
    <figure className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={t("network.outlookTitle")}>
        {[70, 75, 80, 85, 90, 95].map((lon) => {
          const { x } = project(LAT[0], lon);
          return (
            <g key={`lon${lon}`}>
              <line x1={x} x2={x} y1={0} y2={H} stroke="var(--color-line)" />
              <text x={x + 4} y={H - 6} fontSize="12" fill="var(--color-ink-faint)">
                {lon}°E
              </text>
            </g>
          );
        })}
        {[10, 15, 20, 25, 30, 35].map((lat) => {
          const { y } = project(lat, LON[0]);
          return (
            <g key={`lat${lat}`}>
              <line x1={0} x2={W} y1={y} y2={y} stroke="var(--color-line)" />
              <text x={4} y={y - 4} fontSize="12" fill="var(--color-ink-faint)">
                {lat}°N
              </text>
            </g>
          );
        })}
        {districts.map((d) => {
          const { x, y } = project(d.lat, d.lon);
          const top = d.top[0]!;
          const selected = active?.district === d.district;
          return (
            <circle
              key={`${d.district}-${d.state}`}
              cx={x}
              cy={y}
              r={selected ? 11 : 8}
              fill={cropColor(top.cropId, categoryOf[top.cropId])}
              stroke="var(--color-surface)"
              strokeWidth={2.5}
              tabIndex={0}
              role="button"
              aria-label={`${d.district}, ${d.state}: ${nameOf[top.cropId] ?? top.cropId}`}
              onMouseEnter={() => setActive(d)}
              onFocus={() => setActive(d)}
              onClick={() => setActive(d)}
              className="cursor-pointer transition-[r] outline-none focus-visible:stroke-water"
            />
          );
        })}
      </svg>

      {active ? (
        <div className="absolute top-3 right-3 w-60 rounded-panel border border-line bg-surface p-4 text-sm shadow-md">
          <p className="font-semibold">
            {active.district}, <span className="font-normal text-ink-soft">{active.state}</span>
          </p>
          <ol className="mt-2 space-y-1.5">
            {active.top.map((c, i) => (
              <li key={c.cropId} className="flex items-baseline justify-between gap-2">
                <span>
                  <span className="text-ink-faint tabular">{i + 1}. </span>
                  {nameOf[c.cropId] ?? c.cropId}
                </span>
                <span className="text-ink-soft tabular">{inr(c.profitP50)}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
      <figcaption className="mt-2 text-xs text-ink-faint">{t("network.mapNote")}</figcaption>
    </figure>
  );
}
