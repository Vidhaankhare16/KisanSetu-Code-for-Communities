"use client";

import { useState } from "react";
import { Bug, Calendar, CloudRain, Droplets, Eye, Thermometer } from "lucide-react";
import type { SimCrop, SimDay, SimLocation, SimStage } from "@/contracts/simulation";
import { CropIcon } from "@/features/crops/art/CropIcon";
import { FieldScene } from "@/features/simulator/scene/FieldScene";
import { CloseUp } from "./CloseUp";
import type { SimulatorLabels } from "./labels";
import { formatDate } from "./utils";

interface SceneFrameProps {
  crop: SimCrop;
  cropLabel?: string;
  location: SimLocation;
  day: SimDay;
  totalDays: number;
  stage?: SimStage;
  labels: SimulatorLabels;
  pestPressure?: boolean;
  compact?: boolean;
}

/** The field scene with its status overlays: what, where, when, and today's weather. */
export function SceneFrame({ crop, cropLabel, location, day, totalDays, stage, labels, pestPressure, compact = false }: SceneFrameProps) {
  const [closeUp, setCloseUp] = useState(false);
  const chip = "flex items-center gap-1.5 rounded-full bg-surface/90 px-3 py-1 text-xs shadow-sm backdrop-blur";
  return (
    <div className="relative overflow-hidden rounded-panel border border-line bg-surface">
      <FieldScene
        crop={crop}
        location={location}
        day={day}
        stage={stage}
        compact={compact}
        pestPressure={pestPressure}
        title={labels.closeUpTitle.replace("{crop}", cropLabel ?? crop.name).replace("{date}", formatDate(day.date))}
        labels={{ rootZoneWater: labels.rootZoneWater, depthTop: labels.depthTop, depthMid: labels.depthMid }}
      />

      <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-wrap items-start justify-between gap-2">
        {compact ? (
          <span />
        ) : (
          <div className="flex items-center gap-2 rounded-panel bg-surface/90 py-1 pr-3 pl-1 shadow-sm backdrop-blur">
            <CropIcon cropId={crop.id} category={crop.category} className="size-9" />
            <div className="leading-tight">
              <p className="font-semibold text-ink">
                {cropLabel ?? crop.name} <span className="text-sm font-normal text-ink-soft">{crop.localName}</span>
              </p>
              <p className="text-xs text-ink-soft">{[location.name, location.state].filter(Boolean).join(", ")}</p>
            </div>
          </div>
        )}
        <div className="flex flex-wrap justify-end gap-1.5">
          <span className={chip} title={day.weatherSource === "forecast" ? labels.forecastBadgeTip : labels.climatologyBadgeTip}>
            <span className={`size-2 rounded-full ${day.weatherSource === "forecast" ? "bg-water" : "bg-ink-faint"}`} />
            {day.weatherSource === "forecast" ? labels.forecast : labels.climatology}
          </span>
          {stage ? <span className={`${chip} font-medium text-leaf-deep`}>{stage.label}</span> : null}
          <span className={`${chip} tabular`}>
            <Calendar className="size-3.5 text-leaf" aria-hidden />
            {formatDate(day.date)} · {labels.day} {day.day + 1}/{totalDays}
          </span>
        </div>
      </div>

      {compact ? null : (
        <div className="pointer-events-none absolute top-16 left-3 flex flex-wrap gap-1.5 sm:top-[4.5rem]">
          <span className={`${chip} tabular`}>
            <Thermometer className="size-3.5 text-sun" aria-hidden />
            {Math.round(day.tMaxC)}° / {Math.round(day.tMinC)}°
          </span>
          {day.rainMm > 0.5 ? (
            <span className={`${chip} text-water tabular`}>
              <CloudRain className="size-3.5" aria-hidden />
              {day.rainMm.toFixed(0)} mm
            </span>
          ) : null}
          {day.irrigationMm > 0 ? (
            <span className={`${chip} text-water tabular`}>
              <Droplets className="size-3.5" aria-hidden />
              {labels.irrigationApplied} {Math.round(day.irrigationMm)} mm
            </span>
          ) : null}
          {pestPressure ? (
            <span className={`${chip} text-alert`}>
              <Bug className="size-3.5" aria-hidden />
              {labels.pestPressure}
            </span>
          ) : null}
        </div>
      )}

      {compact ? null : (
        <button
          type="button"
          onClick={() => setCloseUp(true)}
          className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-sm font-medium text-ink shadow-sm hover:bg-leaf-soft"
        >
          <Eye className="size-4 text-leaf-deep" aria-hidden />
          {labels.closeUp}
        </button>
      )}
      {closeUp ? <CloseUp crop={crop} cropLabel={cropLabel} day={day} stage={stage} labels={labels} onClose={() => setCloseUp(false)} /> : null}
    </div>
  );
}
