import React, { useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
  type TooltipContentProps,
} from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import { SimDay, SimStage } from "./types";
import { SimulatorLabels } from "./labels";
import { formatDate } from "./utils";
import { Droplets, TrendingUp, Thermometer, Layers } from "lucide-react";

interface ChartsPanelProps {
  days: SimDay[];
  stages: SimStage[];
  currentDayIndex: number;
  labels: SimulatorLabels;
  onSelectDay?: (day: number) => void;
}

type TooltipProps = TooltipContentProps<ValueType, NameType>;

export const ChartsPanel: React.FC<ChartsPanelProps> = ({ days, stages, currentDayIndex, labels, onSelectDay }) => {
  const [activeTab, setActiveTab] = useState<"water" | "growth" | "temp">("water");

  // Format data for recharts
  const chartData = days.map((d) => ({
    day: d.day,
    displayDay: d.day + 1,
    date: formatDate(d.date),
    rainMm: d.rainMm,
    irrigationMm: d.irrigationMm,
    soilMoisturePct: d.soilMoisturePct,
    canopyCoverPct: Math.round(d.canopyCover * 100),
    biomassKgHa: d.biomassKgHa,
    tMaxC: d.tMaxC,
    tMinC: d.tMinC,
    waterStress: Math.round(d.waterStress * 100),
    heatStress: Math.round(d.heatStress * 100),
  }));

  // Custom Dark Tooltip
  const renderCustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (!active || !payload || !payload.length) return null;
    const currentItem = chartData.find((d) => d.day === label);

    return (
      <div className="p-3 rounded-xl bg-surface backdrop-blur-md border border-line-strong text-xs shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-1.5 pb-1 border-b border-line tabular text-[11px] text-ink-soft">
          <span>{currentItem?.date}</span>
          <span className="text-leaf-deep font-semibold">
            {labels.day} {currentItem?.displayDay}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          {payload.map((entry, i) => (
            <div key={`tip-${i}`} className="flex items-center justify-between gap-3">
              <span className="text-ink-soft flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                {entry.name}:
              </span>
              <span className="font-semibold text-ink tabular-nums">
                {entry.value}
                {entry.unit || ""}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full p-4 sm:p-5 rounded-3xl bg-surface border border-line shadow-sm flex flex-col gap-4">
      {/* -------------------------------------------------------------
          TABS & HEADER
      ------------------------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-leaf-deep" />
          <h3 className="text-sm font-semibold text-ink tracking-wide">{labels.chartsTitle}</h3>
        </div>

        {/* Tab switcher buttons */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-surface/90 border border-line">
          <button
            type="button"
            onClick={() => setActiveTab("water")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === "water" ? "bg-water text-white shadow-sm font-semibold" : "text-ink-soft hover:text-ink"
            }`}
          >
            <Droplets className="w-3.5 h-3.5" />
            <span>{labels.tabWaterBalance}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("growth")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === "growth" ? "bg-leaf-deep text-white shadow-sm font-semibold" : "text-ink-soft hover:text-ink"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{labels.tabGrowthBiomass}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("temp")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === "temp" ? "bg-sun text-white shadow-sm font-semibold" : "text-ink-soft hover:text-ink"
            }`}
          >
            <Thermometer className="w-3.5 h-3.5" />
            <span>{labels.tabTemperatureStress}</span>
          </button>
        </div>
      </div>

      {/* -------------------------------------------------------------
          CHART RENDERER
      ------------------------------------------------------------- */}
      <div className="w-full h-64 sm:h-72">
        {/* TAB 1: WATER BALANCE (Rain + Irrigation + Soil Moisture) */}
        {activeTab === "water" && (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              onClick={(e) => {
                if (e && e.activeLabel !== undefined && onSelectDay) {
                  onSelectDay(Number(e.activeLabel));
                }
              }}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" vertical={false} />
              <XAxis
                dataKey="day"
                tickFormatter={(val) => {
                  const d = chartData.find((item) => item.day === val);
                  return d ? d.date : `${val}`;
                }}
                stroke="var(--color-line-strong)"
                tick={{ fontSize: 10, fill: "var(--color-ink-soft)" }}
                interval={Math.floor(days.length / 8)}
              />
              <YAxis yAxisId="mm" stroke="var(--color-line-strong)" tick={{ fontSize: 10, fill: "var(--color-ink-soft)" }} domain={[0, "auto"]} />
              <YAxis
                yAxisId="pct"
                orientation="right"
                stroke="var(--color-water)"
                tick={{ fontSize: 10, fill: "var(--color-water)" }}
                domain={[0, 100]}
                unit="%"
              />
              <Tooltip content={renderCustomTooltip} />

              {/* Shaded Stage demarcation lines */}
              {stages.map((stg) => (
                <ReferenceLine key={`stg-line-${stg.key}`} x={stg.startDay} stroke="var(--color-line-strong)" strokeDasharray="2 2" yAxisId="mm" />
              ))}

              {/* Vertical Reference Line at Current Playhead Day */}
              <ReferenceLine
                x={currentDayIndex}
                stroke="var(--color-leaf)"
                strokeWidth={2}
                yAxisId="mm"
                label={{
                  value: `${labels.day} ${currentDayIndex + 1}`,
                  position: "insideTopLeft",
                  fill: "var(--color-leaf)",
                  fontSize: 10,
                  fontWeight: 600,
                }}
              />

              {/* Rain bars */}
              <Bar yAxisId="mm" dataKey="rainMm" name={labels.chartRainLegend} fill="var(--color-water)" opacity={0.8} radius={[3, 3, 0, 0]} />
              {/* Irrigation bars */}
              <Bar yAxisId="mm" dataKey="irrigationMm" name={labels.chartIrrigationLegend} fill="var(--color-leaf)" opacity={0.9} radius={[3, 3, 0, 0]} />
              {/* Soil moisture line */}
              <Line
                yAxisId="pct"
                type="monotone"
                dataKey="soilMoisturePct"
                name={labels.chartSoilMoistureLegend}
                stroke="var(--color-water)"
                strokeWidth={2.5}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}

        {/* TAB 2: GROWTH & BIOMASS (Canopy Cover % and Biomass kg/ha) */}
        {activeTab === "growth" && (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              onClick={(e) => {
                if (e && e.activeLabel !== undefined && onSelectDay) {
                  onSelectDay(Number(e.activeLabel));
                }
              }}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" vertical={false} />
              <XAxis
                dataKey="day"
                tickFormatter={(val) => {
                  const d = chartData.find((item) => item.day === val);
                  return d ? d.date : `${val}`;
                }}
                stroke="var(--color-line-strong)"
                tick={{ fontSize: 10, fill: "var(--color-ink-soft)" }}
                interval={Math.floor(days.length / 8)}
              />
              <YAxis yAxisId="bio" stroke="var(--color-line-strong)" tick={{ fontSize: 10, fill: "var(--color-ink-soft)" }} />
              <YAxis
                yAxisId="canopy"
                orientation="right"
                stroke="var(--color-leaf)"
                tick={{ fontSize: 10, fill: "var(--color-leaf)" }}
                domain={[0, 100]}
                unit="%"
              />
              <Tooltip content={renderCustomTooltip} />

              <ReferenceLine
                x={currentDayIndex}
                stroke="var(--color-leaf)"
                strokeWidth={2}
                yAxisId="bio"
                label={{
                  value: `${labels.day} ${currentDayIndex + 1}`,
                  position: "insideTopLeft",
                  fill: "var(--color-leaf)",
                  fontSize: 10,
                  fontWeight: 600,
                }}
              />

              {/* Biomass accumulation area */}
              <Area
                yAxisId="bio"
                type="monotone"
                dataKey="biomassKgHa"
                name={labels.chartBiomassLegend}
                stroke="var(--color-leaf)"
                fill="var(--color-leaf-soft)"
                strokeWidth={2}
              />
              {/* Canopy cover line */}
              <Line
                yAxisId="canopy"
                type="monotone"
                dataKey="canopyCoverPct"
                name={labels.chartCanopyLegend}
                stroke="var(--color-leaf-deep)"
                strokeWidth={2.5}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}

        {/* TAB 3: TEMPERATURE & STRESS (tMin, tMax, and Stress indicators) */}
        {activeTab === "temp" && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              onClick={(e) => {
                if (e && e.activeLabel !== undefined && onSelectDay) {
                  onSelectDay(Number(e.activeLabel));
                }
              }}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" vertical={false} />
              <XAxis
                dataKey="day"
                tickFormatter={(val) => {
                  const d = chartData.find((item) => item.day === val);
                  return d ? d.date : `${val}`;
                }}
                stroke="var(--color-line-strong)"
                tick={{ fontSize: 10, fill: "var(--color-ink-soft)" }}
                interval={Math.floor(days.length / 8)}
              />
              <YAxis stroke="var(--color-line-strong)" tick={{ fontSize: 10, fill: "var(--color-ink-soft)" }} unit="°C" domain={["auto", "auto"]} />
              <Tooltip content={renderCustomTooltip} />

              <ReferenceLine
                x={currentDayIndex}
                stroke="var(--color-sun)"
                strokeWidth={2}
                label={{
                  value: `${labels.day} ${currentDayIndex + 1}`,
                  position: "insideTopLeft",
                  fill: "var(--color-sun)",
                  fontSize: 10,
                  fontWeight: 600,
                }}
              />

              {/* Stress warning baseline (32°C for heat, 5°C for cold) */}
              <ReferenceLine y={32} stroke="var(--color-alert)" strokeDasharray="3 3" strokeWidth={1} />
              <ReferenceLine y={5} stroke="var(--color-water)" strokeDasharray="3 3" strokeWidth={1} />

              <Area type="monotone" dataKey="tMaxC" name={labels.chartMaxTempLegend} stroke="var(--color-sun)" fill="var(--color-sun-soft)" strokeWidth={2} />
              <Area
                type="monotone"
                dataKey="tMinC"
                name={labels.chartMinTempLegend}
                stroke="var(--color-water)"
                fill="var(--color-water-soft)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Legend summary row */}
      <div className="flex flex-wrap items-center justify-between text-[11px] text-ink-soft pt-1">
        <div className="flex items-center gap-4">
          {activeTab === "water" && (
            <>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-water" />
                {labels.chartRainLegend}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-leaf-deep" />
                {labels.chartIrrigationLegend}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-1 rounded bg-water" />
                {labels.chartSoilMoistureLegend}
              </span>
            </>
          )}

          {activeTab === "growth" && (
            <>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-leaf-deep" />
                {labels.chartBiomassLegend}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-1 rounded bg-leaf" />
                {labels.chartCanopyLegend}
              </span>
            </>
          )}

          {activeTab === "temp" && (
            <>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-1 rounded bg-sun" />
                {labels.chartMaxTempLegend}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-1 rounded bg-water" />
                {labels.chartMinTempLegend}
              </span>
              <span className="text-[10px] text-alert tabular">Dash: 32°C Heat / 5°C Frost thresholds</span>
            </>
          )}
        </div>

        <span className="text-ink-faint text-[10px]">{labels.chartsHint}</span>
      </div>
    </div>
  );
};
