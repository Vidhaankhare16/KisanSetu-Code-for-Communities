"use client";

/**
 * The season simulator: the living field, a playback timeline with event pins, live gauges,
 * season charts and the harvest outcome — all driven by one `SimulationResult`.
 * (Originally prototyped in Google AI Studio; rebuilt on the platform's crop art and design system.)
 */
import { useEffect, useMemo, useState } from "react";
import { Bug, CloudLightning, Droplets, Flag, FlaskConical, Microscope, Snowflake, Sprout, Sun, Wheat } from "lucide-react";
import type { EventType, SimEvent, SimulationResult } from "@/contracts/simulation";
import { cn } from "@/lib/cn";
import { ChartsPanel } from "./ChartsPanel";
import { CompareView } from "./CompareView";
import { GaugesRow } from "./GaugesRow";
import { HarvestOutcomeCard } from "./HarvestOutcomeCard";
import { defaultLabels, type SimulatorLabels } from "./labels";
import { SceneFrame } from "./SceneFrame";
import { Scrubber } from "./Scrubber";
import { formatDate, getSeverityStyle } from "./utils";

export interface CropSimulatorProps {
  result: SimulationResult;
  /** Optional second scenario (different crop or sowing date) to compare side by side. */
  compareWith?: SimulationResult;
  autoPlay?: boolean;
  labels?: Partial<SimulatorLabels>;
  /** Crop name in the UI language (falls back to the English name). */
  cropLabel?: string;
  /** Name of the comparison crop in the UI language. */
  compareLabel?: string;
  onEventSelect?: (event: SimEvent) => void;
  className?: string;
}

/** Days a field note stays on screen after its event. */
const NOTE_LINGER_DAYS = 10;
/** Pest-weather windows are drawn from a few days before an alert to some days after. */
const PEST_WINDOW: [number, number] = [-3, 10];
const DAY_MS = 85;

const EVENT_ICONS: Record<EventType, typeof Sprout> = {
  sowing: Sprout,
  stage_change: Flag,
  irrigation: Droplets,
  fertilizer: FlaskConical,
  dry_spell: Sun,
  heavy_rain: CloudLightning,
  heat_stress: Sun,
  cold_stress: Snowflake,
  pest_risk: Bug,
  disease_risk: Microscope,
  harvest: Wheat,
};

export function CropSimulator({
  result,
  compareWith,
  autoPlay = false,
  labels: custom,
  cropLabel,
  compareLabel,
  onEventSelect,
  className,
}: CropSimulatorProps) {
  const labels = useMemo<SimulatorLabels>(() => ({ ...defaultLabels, ...custom }), [custom]);
  const totalDays = compareWith ? Math.max(result.durationDays, compareWith.durationDays) : result.durationDays;
  const lastDay = totalDays - 1;

  const [dayIndex, setDayIndex] = useState(0);
  const [playing, setPlaying] = useState(autoPlay);
  const [speed, setSpeed] = useState(1);
  const [comparing, setComparing] = useState(Boolean(compareWith));
  const [pinned, setPinned] = useState<SimEvent | null>(null);

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(
      () => {
        setDayIndex((d) => {
          if (d >= lastDay) {
            setPlaying(false);
            return lastDay;
          }
          return d + 1;
        });
      },
      Math.max(20, Math.round(DAY_MS / speed)),
    );
    return () => clearInterval(timer);
  }, [playing, speed, lastDay]);

  const safeIndex = Math.min(dayIndex, result.days.length - 1);
  const day = result.days[safeIndex]!;
  const stage = result.stages.find((s) => safeIndex >= s.startDay && safeIndex <= s.endDay);
  const atHarvest = dayIndex >= result.durationDays - 1;

  const cumulative = useMemo(() => {
    let rain = 0;
    let irrigation = 0;
    let etc = 0;
    for (let i = 0; i <= safeIndex; i++) {
      const d = result.days[i]!;
      rain += d.rainMm;
      irrigation += d.irrigationMm;
      etc += d.etcMm;
    }
    return { rain: round1(rain), irrigation: round1(irrigation), etc: round1(etc) };
  }, [result.days, safeIndex]);

  const pestPressure = result.events.some(
    (e) => (e.type === "pest_risk" || e.type === "disease_risk") && safeIndex - e.day >= PEST_WINDOW[0] && safeIndex - e.day <= PEST_WINDOW[1],
  );
  // The pinned note (from a click) wins; otherwise show the latest event that just happened.
  const latest = [...result.events].reverse().find((e) => e.day <= safeIndex && safeIndex - e.day <= NOTE_LINGER_DAYS && e.type !== "stage_change");
  const note = pinned && Math.abs(pinned.day - safeIndex) <= NOTE_LINGER_DAYS ? pinned : latest;

  const seek = (d: number) => {
    setDayIndex(Math.max(0, Math.min(lastDay, d)));
    setPinned(null);
  };
  const selectEvent = (event: SimEvent) => {
    setDayIndex(event.day);
    setPinned(event);
    onEventSelect?.(event);
  };

  return (
    <div className={cn("flex w-full flex-col gap-5", className)}>
      {compareWith ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-ink-soft">
            <span className="font-semibold text-ink">{cropLabel ?? result.crop.name}</span> ·{" "}
            <span className="font-semibold text-ink">{compareLabel ?? compareWith.crop.name}</span>
          </p>
          <button
            type="button"
            onClick={() => setComparing((c) => !c)}
            aria-pressed={comparing}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium",
              comparing ? "border-leaf-deep bg-leaf-soft text-leaf-deep" : "border-line bg-surface text-ink",
            )}
          >
            {labels.compareScenarios}
          </button>
        </div>
      ) : null}

      {comparing && compareWith ? (
        <CompareView
          primary={result}
          secondary={compareWith}
          primaryLabel={cropLabel ?? result.crop.name}
          secondaryLabel={compareLabel ?? compareWith.crop.name}
          currentDayIndex={dayIndex}
          labels={labels}
        />
      ) : (
        <div>
          <SceneFrame
            crop={result.crop}
            cropLabel={cropLabel}
            location={result.location}
            day={day}
            totalDays={result.durationDays}
            stage={stage}
            labels={labels}
            pestPressure={pestPressure}
          />
          <FieldNote event={note} labels={labels} onClose={() => setPinned(null)} />
        </div>
      )}

      <Scrubber
        currentDayIndex={dayIndex}
        totalDays={totalDays}
        stages={result.stages}
        events={result.events}
        forecastDaysCount={result.days.filter((d) => d.weatherSource === "forecast").length}
        isPlaying={playing}
        speed={speed}
        labels={labels}
        onDayChange={seek}
        onTogglePlay={() => {
          if (!playing && dayIndex >= lastDay) setDayIndex(0);
          setPlaying((p) => !p);
        }}
        onRestart={() => {
          setDayIndex(0);
          setPlaying(true);
        }}
        onSpeedChange={setSpeed}
        onJumpToHarvest={() => {
          setPlaying(false);
          setDayIndex(result.durationDays - 1);
        }}
        onEventClick={selectEvent}
      />

      <GaugesRow day={day} cumulativeRain={cumulative.rain} cumulativeIrrigation={cumulative.irrigation} cumulativeEtc={cumulative.etc} labels={labels} />

      <ChartsPanel days={result.days} stages={result.stages} currentDayIndex={safeIndex} labels={labels} onSelectDay={seek} />

      <HarvestOutcomeCard
        crop={result.crop}
        cropLabel={cropLabel}
        outcome={result.outcome}
        narrative={result.narrative}
        dataSources={result.dataSources}
        labels={labels}
        highlight={atHarvest}
      />
    </div>
  );
}

function FieldNote({ event, labels, onClose }: { event?: SimEvent | null; labels: SimulatorLabels; onClose: () => void }) {
  if (!event) {
    return <p className="mt-3 min-h-[5.5rem] rounded-panel border border-dashed border-line-strong px-4 py-3 text-sm text-ink-soft">{labels.noFieldNote}</p>;
  }
  const style = getSeverityStyle(event.severity);
  const Icon = EVENT_ICONS[event.type];
  return (
    <div role="status" className={cn("mt-3 flex min-h-[5.5rem] gap-3 rounded-panel border px-4 py-3", style.panel)}>
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", style.icon)}>
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-semibold text-ink">{event.title}</span>
          <span className="text-xs text-ink-soft tabular">
            {formatDate(event.date, labels.months)} · {labels.day} {event.day + 1}
          </span>
        </p>
        <p className="text-sm text-ink-soft">{event.detail}</p>
        {event.action ? (
          <p className="mt-1 text-sm text-ink">
            <span className="font-medium text-leaf-deep">{labels.recommendedAction}: </span>
            {event.action}
          </p>
        ) : null}
      </div>
      <button type="button" onClick={onClose} className="self-start text-xs text-ink-soft hover:text-ink" aria-label={labels.dismissEvent}>
        ×
      </button>
    </div>
  );
}

const round1 = (v: number) => Math.round(v * 10) / 10;
