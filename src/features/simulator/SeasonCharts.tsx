"use client";

import { useMemo, useState } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SimulationResult } from "@/contracts/simulation";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/cn";
import { shortDate } from "@/lib/format";

type Tab = "water" | "growth" | "temperature";

const AXIS = { fontSize: 12, fill: "var(--color-ink-soft)" };

/** Water, growth and temperature over the season, with the playhead as a reference line. */
export function SeasonCharts({ simulation, day }: { simulation: SimulationResult; day: number }) {
  const { t, lang } = useI18n();
  const [tab, setTab] = useState<Tab>("water");
  const data = useMemo(
    () =>
      simulation.days.map((d) => ({
        label: shortDate(d.date, lang),
        day: d.day,
        rain: d.rainMm,
        irrigation: d.irrigationMm,
        moisture: d.soilMoisturePct,
        canopy: Math.round(d.canopyCover * 100),
        biomass: d.biomassKgHa,
        tRange: [d.tMinC, d.tMaxC] as [number, number],
        tMax: d.tMaxC,
      })),
    [simulation, lang],
  );
  const current = data[day]?.label;

  const tabs: { key: Tab; label: string }[] = [
    { key: "water", label: t("sim.chartWater") },
    { key: "growth", label: t("sim.chartGrowth") },
    { key: "temperature", label: t("sim.chartTemperature") },
  ];

  return (
    <div>
      <div role="tablist" className="mb-3 flex gap-1">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            role="tab"
            aria-selected={tab === tb.key}
            onClick={() => setTab(tb.key)}
            className={cn(
              "rounded-control px-3 py-1.5 text-sm",
              tab === tb.key ? "bg-ink text-white" : "text-ink-soft hover:bg-ink/5",
            )}
          >
            {tb.label}
          </button>
        ))}
      </div>
      <div className="h-64" role="tabpanel">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }} barGap={0} barCategoryGap={0}>
            <CartesianGrid stroke="var(--color-line)" vertical={false} />
            <XAxis dataKey="label" tick={AXIS} interval="preserveStartEnd" minTickGap={40} tickLine={false} axisLine={false} />
            {tab === "water" ? (
              <>
                <YAxis yAxisId="mm" tick={AXIS} tickLine={false} axisLine={false} width={40} />
                <YAxis yAxisId="pct" orientation="right" domain={[0, 100]} tick={AXIS} tickLine={false} axisLine={false} width={34} />
                <Bar yAxisId="mm" stackId="water" dataKey="rain" name={`${t("sim.rain")} (mm)`} fill="var(--color-water)" opacity={0.45} isAnimationActive={false} />
                <Bar yAxisId="mm" stackId="water" dataKey="irrigation" name={`${t("sim.waterUsed")} (mm)`} fill="var(--color-water)" isAnimationActive={false} />
                <Line yAxisId="pct" dataKey="moisture" name={`${t("sim.soilMoisture")} (%)`} stroke="var(--color-soil)" dot={false} strokeWidth={2} isAnimationActive={false} />
              </>
            ) : null}
            {tab === "growth" ? (
              <>
                <YAxis yAxisId="pct" domain={[0, 100]} tick={AXIS} tickLine={false} axisLine={false} width={40} />
                <YAxis yAxisId="kg" orientation="right" tick={AXIS} tickLine={false} axisLine={false} width={48} />
                <Area yAxisId="pct" dataKey="canopy" name={`${t("sim.canopy")} (%)`} stroke="var(--color-leaf)" fill="var(--color-leaf-soft)" isAnimationActive={false} />
                <Line yAxisId="kg" dataKey="biomass" name={`${t("sim.biomass")} (kg/ha)`} stroke="var(--color-leaf-deep)" dot={false} strokeWidth={2} isAnimationActive={false} />
              </>
            ) : null}
            {tab === "temperature" ? (
              <>
                <YAxis yAxisId="c" tick={AXIS} tickLine={false} axisLine={false} width={40} unit="°" />
                <Area yAxisId="c" dataKey="tRange" name="°C" stroke="var(--color-sun)" fill="var(--color-sun-soft)" isAnimationActive={false} />
              </>
            ) : null}
            <Tooltip contentStyle={{ borderRadius: 8, borderColor: "var(--color-line)", fontSize: 13 }} />
            {current ? <ReferenceLine x={current} yAxisId={tab === "water" ? "mm" : tab === "growth" ? "pct" : "c"} stroke="var(--color-ink)" strokeDasharray="3 3" /> : null}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
