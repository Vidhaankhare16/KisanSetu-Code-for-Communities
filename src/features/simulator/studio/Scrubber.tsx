import React, { useState } from "react";
import { SimStage, SimEvent } from "./types";
import { SimulatorLabels } from "./labels";
import { getSeverityStyle } from "./utils";
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Flame,
  ThermometerSnowflake,
  Bug,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

interface ScrubberProps {
  currentDayIndex: number;
  totalDays: number;
  stages: SimStage[];
  events: SimEvent[];
  forecastDaysCount?: number; // usually 16
  isPlaying: boolean;
  speed: number;
  labels: SimulatorLabels;
  onDayChange: (day: number) => void;
  onTogglePlay: () => void;
  onRestart: () => void;
  onSpeedChange: (speed: number) => void;
  onJumpToHarvest: () => void;
  onEventClick?: (event: SimEvent) => void;
}

export const Scrubber: React.FC<ScrubberProps> = ({
  currentDayIndex,
  totalDays,
  stages,
  events,
  forecastDaysCount = 16,
  isPlaying,
  speed,
  labels,
  onDayChange,
  onTogglePlay,
  onRestart,
  onSpeedChange,
  onJumpToHarvest,
  onEventClick,
}) => {
  const [hoveredEvent, setHoveredEvent] = useState<SimEvent | null>(null);

  // Keyboard navigation for scrubber input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      onDayChange(Math.max(0, currentDayIndex - 1));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      onDayChange(Math.min(totalDays - 1, currentDayIndex + 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      onDayChange(0);
    } else if (e.key === "End") {
      e.preventDefault();
      onDayChange(totalDays - 1);
    }
  };

  // Helper for event pin icons
  const getEventIcon = (type: string) => {
    switch (type) {
      case "cold_stress":
        return <ThermometerSnowflake className="w-3 h-3 text-water" />;
      case "heat_stress":
        return <Flame className="w-3 h-3 text-[#8a5f00]" />;
      case "pest_risk":
      case "disease_risk":
        return <Bug className="w-3 h-3 text-alert" />;
      case "irrigation":
        return <Droplets className="w-3 h-3 text-water" />;
      case "harvest":
        return <CheckCircle2 className="w-3 h-3 text-[#8a5f00]" />;
      default:
        return <AlertTriangle className="w-3 h-3 text-[#8a5f00]" />;
    }
  };

  // Stage ribbon color mapping
  const getStageColor = (key: string, isActive: boolean) => {
    switch (key) {
      case "initial":
        return isActive ? "bg-leaf-deep text-white border-leaf" : "bg-leaf-soft/60 text-leaf border-leaf/30 hover:bg-leaf-soft/60";
      case "development":
        return isActive ? "bg-water text-ink border-water/40" : "bg-water-soft text-water border-water/30 hover:bg-water-soft";
      case "mid":
        return isActive ? "bg-sun text-ink border-sun" : "bg-sun-soft text-[#8a5f00] border-sun/30 hover:bg-sun-soft";
      case "late":
        return isActive ? "bg-soil text-white border-soil" : "bg-soil-soft text-soil border-soil/30 hover:bg-soil-soft";
      default:
        return "bg-ink/10 text-ink-soft border-line-strong";
    }
  };

  const progressPercent = (currentDayIndex / (totalDays - 1)) * 100;
  const forecastPercent = Math.min(100, (forecastDaysCount / totalDays) * 100);

  return (
    <div className="w-full p-4 sm:p-5 rounded-3xl bg-surface border border-line shadow-sm flex flex-col gap-4">
      {/* -------------------------------------------------------------
          1. STAGE RIBBON (Proportional segments across season)
      ------------------------------------------------------------- */}
      <div className="w-full flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs text-ink-soft font-medium px-1">
          <span>{labels.seasonProgress}</span>
          <span className="tabular-nums tabular text-leaf-deep">
            {labels.day} {currentDayIndex + 1} / {totalDays} ({Math.round(progressPercent)}%)
          </span>
        </div>

        <div className="w-full h-8 rounded-xl overflow-hidden flex p-0.5 bg-surface/90 border border-line gap-0.5">
          {stages.map((stg) => {
            const stageDuration = stg.endDay - stg.startDay + 1;
            const widthPct = (stageDuration / totalDays) * 100;
            const isCurrent = currentDayIndex >= stg.startDay && currentDayIndex <= stg.endDay;

            return (
              <button
                key={stg.key}
                type="button"
                onClick={() => onDayChange(stg.startDay)}
                style={{ width: `${widthPct}%` }}
                className={`h-full rounded-lg text-[11px] font-medium transition-all px-1.5 flex items-center justify-center border truncate whitespace-nowrap ${getStageColor(
                  stg.key,
                  isCurrent,
                )}`}
                title={`${stg.label} (${labels.day} ${stg.startDay + 1}–${stg.endDay + 1}): ${stg.description}`}
              >
                <span className="truncate">{stg.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* -------------------------------------------------------------
          2. TIMELINE TRACK & EVENT PINS
      ------------------------------------------------------------- */}
      <div className="relative w-full pt-4 pb-2 px-1">
        {/* Forecast vs Climatology Range Label */}
        <div className="flex items-center justify-between text-[10px] text-ink-soft mb-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm bg-water/40 border border-water/60" />
            <span>
              {labels.forecast} (0 - {forecastDaysCount} d)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm bg-leaf-deep/30 border border-leaf/30" />
            <span>{labels.climatology}</span>
          </div>
        </div>

        {/* Shaded Track Base */}
        <div className="relative h-3 rounded-full bg-ink/5 border border-line overflow-visible">
          {/* Forecast Days Shaded Highlight */}
          <div style={{ width: `${forecastPercent}%` }} className="absolute top-0 bottom-0 left-0 bg-water-soft rounded-l-full border-r border-water/40" />

          {/* Climatology Days Shaded Highlight */}
          <div style={{ left: `${forecastPercent}%`, right: 0 }} className="absolute top-0 bottom-0 bg-leaf-soft/40 rounded-r-full" />

          {/* Completed Progress Fill */}
          <div
            style={{ width: `${progressPercent}%` }}
            className="absolute top-0 bottom-0 left-0 bg-linear-to-r from-leaf via-leaf to-sun rounded-full transition-all duration-75"
          />

          {/* EVENT PINS ON THE TIMELINE (stacked above the range input so they stay clickable) */}
          {events.map((ev, idx) => {
            const evPct = (ev.day / (totalDays - 1)) * 100;
            const style = getSeverityStyle(ev.severity);
            const isHovered = hoveredEvent?.day === ev.day && hoveredEvent?.title === ev.title;

            return (
              <div
                key={`ev-pin-${idx}-${ev.day}`}
                style={{ left: `${evPct}%` }}
                className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 ${isHovered ? "z-50" : "z-40"}`}
              >
                <button
                  type="button"
                  onClick={() => {
                    onDayChange(ev.day);
                    onEventClick?.(ev);
                  }}
                  onMouseEnter={() => setHoveredEvent(ev)}
                  onMouseLeave={() => setHoveredEvent(null)}
                  onFocus={() => setHoveredEvent(ev)}
                  onBlur={() => setHoveredEvent(null)}
                  aria-label={`${ev.title}, ${labels.day} ${ev.day + 1}`}
                  className={`w-6 h-6 rounded-full flex items-center justify-center border transition-transform hover:scale-125 focus:scale-125 focus:outline-none shadow-md ${
                    style.badgeBg
                  } ${style.border} ${ev.day === currentDayIndex ? "ring-2 ring-white scale-110" : ""}`}
                >
                  {getEventIcon(ev.type)}
                </button>

                {/* Event Hover / Focus Tooltip */}
                {isHovered && (
                  <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 w-56 p-2.5 rounded-xl bg-surface backdrop-blur-md border border-line-strong text-xs shadow-sm pointer-events-none">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-bold text-ink truncate">{ev.title}</span>
                      <span className="text-[10px] text-ink-soft tabular shrink-0">
                        {labels.day} {ev.day + 1}
                      </span>
                    </div>
                    <p className="text-[11px] text-ink-soft line-clamp-2 leading-tight">{ev.detail}</p>
                    {ev.action && <p className="mt-1.5 text-[10px] text-leaf-deep font-medium">→ {ev.action}</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* HTML5 Range Scrubber Input Overlay (Full Draggability & Accessibility) */}
        <input
          type="range"
          min={0}
          max={totalDays - 1}
          value={currentDayIndex}
          onChange={(e) => onDayChange(parseInt(e.target.value, 10))}
          onKeyDown={handleKeyDown}
          aria-label={labels.seasonProgress}
          aria-valuemin={0}
          aria-valuemax={totalDays - 1}
          aria-valuenow={currentDayIndex}
          aria-valuetext={`${labels.day} ${currentDayIndex + 1} ${labels.of} ${totalDays}`}
          className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30"
        />
      </div>

      {/* -------------------------------------------------------------
          3. PLAYBACK CONTROLS & SPEED SELECTOR
      ------------------------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-line">
        {/* Left: Playback buttons */}
        <div className="flex items-center gap-1.5">
          {/* Restart */}
          <button
            type="button"
            onClick={onRestart}
            aria-label={labels.restart}
            className="p-2 rounded-xl text-ink-soft hover:text-ink hover:bg-ink/5 transition-colors"
            title={labels.restart}
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Step Backward */}
          <button
            type="button"
            onClick={() => onDayChange(Math.max(0, currentDayIndex - 1))}
            disabled={currentDayIndex === 0}
            aria-label={labels.stepBackward}
            className="p-2 rounded-xl text-ink-soft hover:text-ink hover:bg-ink/5 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title={labels.stepBackward}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Primary Play / Pause button */}
          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={isPlaying ? labels.pause : labels.play}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-leaf-deep hover:bg-leaf text-white font-semibold text-xs transition-all shadow-md shadow-leaf/10 active:scale-95"
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-white" />
                <span>{labels.pause}</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>{labels.play}</span>
              </>
            )}
          </button>

          {/* Step Forward */}
          <button
            type="button"
            onClick={() => onDayChange(Math.min(totalDays - 1, currentDayIndex + 1))}
            disabled={currentDayIndex >= totalDays - 1}
            aria-label={labels.stepForward}
            className="p-2 rounded-xl text-ink-soft hover:text-ink hover:bg-ink/5 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title={labels.stepForward}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Center: Jump to Harvest */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onJumpToHarvest}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-mist hover:bg-ink/5 border border-line text-xs text-[#8a5f00] font-medium transition-colors"
            aria-label={labels.jumpToHarvest}
          >
            <SkipForward className="w-3.5 h-3.5" />
            <span>{labels.jumpToHarvest}</span>
          </button>
        </div>

        {/* Right: Speed Multiplier Selector (1x, 2x, 4x) */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-surface/90 border border-line">
          <span className="text-[11px] text-ink-soft px-2 font-medium">{labels.speed}:</span>
          {[1, 2, 4].map((s) => (
            <button
              key={`spd-${s}`}
              type="button"
              onClick={() => onSpeedChange(s)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold tabular-nums transition-colors ${
                speed === s ? "bg-leaf-deep text-white shadow-sm" : "text-ink-soft hover:text-ink"
              }`}
              aria-label={`${labels.speed} ${s}x`}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
