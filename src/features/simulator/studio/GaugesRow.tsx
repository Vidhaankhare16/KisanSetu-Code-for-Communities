import React from "react";
import { SimDay } from "./types";
import { SimulatorLabels } from "./labels";
import { Droplets, Activity, AlertTriangle, Thermometer, Sprout, Scale } from "lucide-react";

interface GaugesRowProps {
  day: SimDay;
  cumulativeRain: number;
  cumulativeIrrigation: number;
  cumulativeEtc: number;
  labels: SimulatorLabels;
}

export const GaugesRow: React.FC<GaugesRowProps> = ({ day, cumulativeRain, cumulativeIrrigation, cumulativeEtc, labels }) => {
  const { soilMoisturePct, health, waterStress, heatStress, plantHeightCm, canopyCover } = day;

  // Status text for soil moisture
  const getSoilMoistureStatus = (pct: number) => {
    if (pct < 35) return { label: labels.soilMoistureStatusDry, color: "text-[#8a5f00] bg-sun-soft border-sun/40" };
    if (pct > 80) return { label: labels.soilMoistureStatusWet, color: "text-water bg-water/10 border-water/30" };
    return { label: labels.soilMoistureStatusOptimal, color: "text-leaf-deep bg-leaf-soft border-leaf/30" };
  };

  // Status for health
  const getHealthStatus = (h: number) => {
    if (h >= 80) return { label: labels.cropHealthStatusGood, color: "text-leaf-deep" };
    if (h >= 55) return { label: labels.cropHealthStatusFair, color: "text-[#8a5f00]" };
    return { label: labels.cropHealthStatusPoor, color: "text-alert" };
  };

  const soilStatus = getSoilMoistureStatus(soilMoisturePct);
  const healthStatus = getHealthStatus(health);

  return (
    <div className="w-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* 1. Soil Moisture (PAW) */}
      <div className="p-3.5 rounded-2xl bg-surface border border-line flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-ink-soft flex items-center gap-1.5">
            <Droplets className="w-3.5 h-3.5 text-water" />
            {labels.soilMoisture}
          </span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${soilStatus.color}`}>{soilStatus.label}</span>
        </div>

        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-2xl font-bold tabular-nums text-ink">{soilMoisturePct}</span>
          <span className="text-xs text-ink-soft">%</span>
        </div>

        {/* Moisture Fill Bar with Safe Range */}
        <div className="mt-2 w-full h-1.5 rounded-full bg-ink/10 overflow-hidden relative">
          {/* Target bracket marker (40 - 80%) */}
          <div className="absolute left-[40%] width-[40%] top-0 bottom-0 bg-ink/5" />
          <div
            style={{ width: `${Math.min(100, soilMoisturePct)}%` }}
            className={`h-full rounded-full transition-all duration-300 ${
              soilMoisturePct < 35 ? "bg-sun" : soilMoisturePct > 80 ? "bg-water" : "bg-leaf-deep"
            }`}
          />
        </div>
      </div>

      {/* 2. Crop Health Index */}
      <div className="p-3.5 rounded-2xl bg-surface border border-line flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-ink-soft flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-leaf-deep" />
            {labels.cropHealth}
          </span>
          <span className={`text-[10px] font-semibold ${healthStatus.color}`}>{healthStatus.label}</span>
        </div>

        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-2xl font-bold tabular-nums text-ink">{health}</span>
          <span className="text-xs text-ink-soft">/ 100</span>
        </div>

        {/* Health Progress Bar */}
        <div className="mt-2 w-full h-1.5 rounded-full bg-ink/10 overflow-hidden">
          <div
            style={{ width: `${Math.min(100, health)}%` }}
            className={`h-full rounded-full transition-all duration-300 ${health >= 80 ? "bg-leaf-deep" : health >= 55 ? "bg-sun" : "bg-alert"}`}
          />
        </div>
      </div>

      {/* 3. Water Stress */}
      <div
        className={`p-3.5 rounded-2xl bg-surface border transition-all duration-300 flex flex-col justify-between ${
          waterStress > 0.3 ? "border-sun/40 bg-sun-soft/60" : "border-line"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-ink-soft flex items-center gap-1.5">
            <AlertTriangle className={`w-3.5 h-3.5 ${waterStress > 0.3 ? "text-[#8a5f00] animate-pulse" : "text-[#8a5f00]"}`} />
            {labels.waterStress}
          </span>
          <span className="text-[10px] text-ink-soft">{waterStress > 0 ? `${Math.round(waterStress * 100)}%` : labels.nominalStress}</span>
        </div>

        <div className="mt-2 flex items-baseline gap-1">
          <span className={`text-2xl font-bold tabular-nums ${waterStress > 0.3 ? "text-[#8a5f00]" : "text-ink"}`}>{Math.round(waterStress * 100)}</span>
          <span className="text-xs text-ink-soft">%</span>
        </div>

        <div className="mt-2 w-full h-1.5 rounded-full bg-ink/10 overflow-hidden">
          <div
            style={{ width: `${Math.min(100, waterStress * 100)}%` }}
            className={`h-full rounded-full transition-all duration-300 ${waterStress > 0.4 ? "bg-alert" : "bg-sun"}`}
          />
        </div>
      </div>

      {/* 4. Temperature / Thermal Stress */}
      <div
        className={`p-3.5 rounded-2xl bg-surface border transition-all duration-300 flex flex-col justify-between ${
          heatStress > 0.2 ? "border-alert/40 bg-alert-soft/60" : "border-line"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-ink-soft flex items-center gap-1.5">
            <Thermometer className={`w-3.5 h-3.5 ${heatStress > 0.2 ? "text-alert animate-pulse" : "text-alert"}`} />
            {labels.temperatureStress}
          </span>
          <span className="text-[10px] text-ink-soft">{heatStress > 0 ? `${Math.round(heatStress * 100)}%` : labels.nominalStress}</span>
        </div>

        <div className="mt-2 flex items-baseline gap-1">
          <span className={`text-2xl font-bold tabular-nums ${heatStress > 0.2 ? "text-alert" : "text-ink"}`}>{Math.round(heatStress * 100)}</span>
          <span className="text-xs text-ink-soft">%</span>
        </div>

        <div className="mt-2 w-full h-1.5 rounded-full bg-ink/10 overflow-hidden">
          <div style={{ width: `${Math.min(100, heatStress * 100)}%` }} className="h-full rounded-full bg-alert transition-all duration-300" />
        </div>
      </div>

      {/* 5. Canopy & Height */}
      <div className="p-3.5 rounded-2xl bg-surface border border-line flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-ink-soft flex items-center gap-1.5">
            <Sprout className="w-3.5 h-3.5 text-leaf-deep" />
            {labels.plantHeight}
          </span>
        </div>

        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-2xl font-bold tabular-nums text-ink">{plantHeightCm}</span>
          <span className="text-xs text-ink-soft">cm</span>
        </div>

        <div className="mt-2 w-full h-1.5 rounded-full bg-ink/10 overflow-hidden">
          <div style={{ width: `${Math.min(100, canopyCover * 100)}%` }} className="h-full rounded-full bg-leaf-deep transition-all duration-300" />
        </div>
        <p className="mt-1 text-[10px] text-ink-soft tabular">
          {labels.canopyCover} {Math.round(canopyCover * 100)}%
        </p>
      </div>

      {/* 6. Cumulative Water Balance (Rain + Irrig vs Demand) */}
      <div className="p-3.5 rounded-2xl bg-surface border border-line flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-ink-soft flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5 text-water" />
            {labels.waterBalance}
          </span>
        </div>

        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-2xl font-bold tabular-nums text-ink">{Math.round(cumulativeRain + cumulativeIrrigation)}</span>
          <span className="text-xs text-ink-soft">/ {Math.round(cumulativeEtc)} mm</span>
        </div>

        {/* Applied vs Demand bar */}
        <div className="mt-2 w-full h-1.5 rounded-full bg-ink/10 overflow-hidden">
          <div
            style={{
              width: `${Math.min(100, cumulativeEtc > 0 ? ((cumulativeRain + cumulativeIrrigation) / cumulativeEtc) * 100 : 50)}%`,
            }}
            className="h-full rounded-full bg-water transition-all duration-300"
          />
        </div>
        <p className="mt-1 text-[10px] text-ink-soft">
          {labels.cumulativeRain} + {labels.cumulativeIrrigation} / {labels.cropWaterDemand}
        </p>
      </div>
    </div>
  );
};
