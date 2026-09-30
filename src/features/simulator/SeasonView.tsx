"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import type { SimulateResponse } from "@/contracts/api";
import type { SimulationResult } from "@/contracts/simulation";
import { Pill, TONE_BG, TONE_TEXT } from "@/components/ui/Tone";
import { useI18n } from "@/i18n/client";
import { cropLabel } from "@/i18n/crops";
import { cn } from "@/lib/cn";
import { inr, num, shortDate } from "@/lib/format";
import { EVENT_ICON, eventTone } from "./eventStyle";
import { SeasonCharts } from "./SeasonCharts";
import { usePlayback } from "./usePlayback";

interface SeasonViewProps {
  simulation: SimulationResult;
  analysis?: SimulateResponse["analysis"];
  /** Optional cinematic visual (the AI Studio simulator) driven by the same playhead. */
  renderVisual?: (props: { simulation: SimulationResult; day: number }) => ReactNode;
}

const VERDICT_TONE = { recommended: "leaf", caution: "sun", not_recommended: "alert" } as const;

export function SeasonView({ simulation, analysis, renderVisual }: SeasonViewProps) {
  const { t, lang } = useI18n();
  const { days, outcome, ensemble } = simulation;
  const { day, playing, seek, toggle, restart } = usePlayback(days.length);
  const today = days[day] ?? days[0]!;
  const stage = simulation.stages.find((s) => day >= s.startDay && day <= s.endDay);
  const listRef = useRef<HTMLOListElement>(null);

  // Keep the most recent event in view while playing (scrolls the list only, never the page).
  useEffect(() => {
    const list = listRef.current;
    if (!playing || !list) return;
    const past = list.querySelectorAll<HTMLElement>('[data-past="true"]');
    const last = past[past.length - 1];
    if (last) list.scrollTop = Math.max(0, last.offsetTop - list.offsetTop - list.clientHeight / 2);
  }, [day, playing]);

  const pctOfPotential = Math.round((outcome.expectedYieldKgHa / outcome.potentialYieldKgHa) * 100);

  return (
    <article className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="display text-2xl font-semibold">
            {cropLabel(t, simulation.crop.id, simulation.crop.name)}{" "}<span className="font-normal text-ink-soft">({lang === "en" ? simulation.crop.localName : simulation.crop.name})</span>
          </h3>
          <p className="text-sm text-ink-soft">
            {simulation.location.name} · {shortDate(simulation.sowingDate, lang)} → {shortDate(simulation.harvestDate, lang)} ·{" "}
            {simulation.durationDays} {t("common.days")}
          </p>
        </div>
        <Pill tone={VERDICT_TONE[outcome.verdict]}>{t(`plan.verdict.${outcome.verdict}`)}</Pill>
      </header>

      {simulation.narrative ? (
        <div className="border-l-4 border-leaf pl-4">
          <p className="text-lg font-medium">{simulation.narrative.headline}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-soft">
            {simulation.narrative.bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-panel border border-line bg-line sm:grid-cols-4">
        <Stat label={t("sim.expectedYield")} value={`${num(outcome.expectedYieldQuintalPerAcre, 1)} ${t("common.quintalPerAcre")}`} note={t("sim.ofPotential", { pct: pctOfPotential })} tone="leaf" />
        <Stat
          label={t("sim.netProfit")}
          value={inr(ensemble?.netProfitPerAcreInr.p50 ?? outcome.netProfitPerAcreInr)}
          note={ensemble ? t("sim.range", { low: inr(ensemble.netProfitPerAcreInr.p10), high: inr(ensemble.netProfitPerAcreInr.p90) }) : undefined}
          tone={outcome.netProfitPerAcreInr < 0 ? "alert" : "leaf"}
        />
        <Stat label={t("sim.waterUsed")} value={`${Math.round(outcome.totalIrrigationMm)} mm`} note={`${t("sim.rain")} ${Math.round(outcome.totalRainMm)} mm`} tone="water" />
        <Stat label={t("sim.regen")} value={`${outcome.regenerativeScore}/100`} note={`${t("sim.risk")} ${outcome.riskScore}/100`} tone="soil" />
      </dl>

      {renderVisual ? renderVisual({ simulation, day }) : null}

      <section aria-label={t("sim.title")} className="rounded-panel border border-line bg-surface p-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={toggle}
            className="inline-flex size-11 items-center justify-center rounded-full bg-leaf-deep text-white hover:bg-leaf"
            aria-label={playing ? t("sim.pause") : t("sim.play")}
          >
            {playing ? <Pause className="size-5" /> : <Play className="size-5 translate-x-px" />}
          </button>
          <button type="button" onClick={restart} className="inline-flex size-9 items-center justify-center rounded-full text-ink-soft hover:bg-ink/5" aria-label={t("sim.restart")}>
            <RotateCcw className="size-4" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium tabular">
              {shortDate(today.date, lang)} · {t("sim.day", { day: day + 1, total: days.length })}
            </p>
            <p className="truncate text-xs text-ink-soft">{stage?.label}</p>
          </div>
          <Pill tone={today.weatherSource === "forecast" ? "water" : "neutral"}>
            {today.weatherSource === "forecast" ? t("sim.forecast") : t("sim.typical")}
          </Pill>
        </div>

        <input
          type="range"
          min={0}
          max={days.length - 1}
          value={day}
          onChange={(e) => seek(Number(e.target.value))}
          aria-label={t("sim.day", { day: day + 1, total: days.length })}
          className="mt-4 w-full accent-leaf-deep"
        />
        <StageRibbon simulation={simulation} onSeek={seek} />

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
          <Gauge label={t("sim.soilMoisture")} value={today.soilMoisturePct} color="var(--color-water)" />
          <Gauge label={t("sim.canopy")} value={today.canopyCover * 100} color="var(--color-leaf)" />
          <Gauge label={t("common.today")} value={today.health} color={today.health > 70 ? "var(--color-leaf)" : today.health > 45 ? "var(--color-sun)" : "var(--color-alert)"} suffix="/100" />
          <div>
            <dt className="text-xs text-ink-soft">°C</dt>
            <dd className="font-medium tabular">
              {Math.round(today.tMinC)}–{Math.round(today.tMaxC)}°
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-soft">{t("sim.rain")}</dt>
            <dd className="font-medium tabular">{today.rainMm.toFixed(1)} mm</dd>
          </div>
        </dl>
      </section>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <section className="rounded-panel border border-line bg-surface p-4">
          <SeasonCharts simulation={simulation} day={day} />
          {ensemble && ensemble.years.length > 1 ? (
            <p className="mt-3 text-xs text-ink-soft">
              {t("sim.ensembleNote", { n: ensemble.members, from: Math.min(...ensemble.years), to: Math.max(...ensemble.years) })}
            </p>
          ) : null}
          {analysis ? <YieldLimits factors={analysis.yieldFactors} /> : null}
        </section>

        <section className="rounded-panel border border-line bg-surface p-4">
          <h4 className="mb-3 font-semibold">{t("sim.events")}</h4>
          <ol ref={listRef} className="max-h-[26rem] space-y-1 overflow-y-auto pr-1">
            {simulation.events.map((e, i) => {
              const Icon = EVENT_ICON[e.type];
              const tone = eventTone(e.type, e.severity);
              const past = e.day <= day;
              return (
                <li key={`${e.type}-${e.day}-${i}`} data-past={past}>
                  <button
                    type="button"
                    onClick={() => seek(e.day)}
                    className={cn("flex w-full gap-3 rounded-control p-2 text-left hover:bg-mist", !past && "opacity-55")}
                  >
                    <span className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full", TONE_BG[tone], TONE_TEXT[tone])}>
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs text-ink-soft tabular">{shortDate(e.date, lang)}</span>
                      <span className="block font-medium">{e.title}</span>
                      <span className="block text-sm text-ink-soft">{e.detail}</span>
                      {e.action ? <span className="mt-1 block text-sm text-ink">{e.action}</span> : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </article>
  );
}

function Stat({ label, value, note, tone }: { label: string; value: string; note?: string; tone: "leaf" | "water" | "soil" | "alert" }) {
  return (
    <div className="bg-surface p-4">
      <dt className="text-xs text-ink-soft">{label}</dt>
      <dd className={cn("display mt-1 text-2xl font-semibold tabular", TONE_TEXT[tone])}>{value}</dd>
      {note ? <dd className="mt-0.5 text-xs text-ink-soft">{note}</dd> : null}
    </div>
  );
}

function Gauge({ label, value, color, suffix = "%" }: { label: string; value: number; color: string; suffix?: string }) {
  return (
    <div>
      <dt className="text-xs text-ink-soft">{label}</dt>
      <dd className="font-medium tabular">
        {Math.round(value)}
        {suffix}
      </dd>
      <dd className="mt-1 h-1.5 rounded-full bg-ink/8">
        <span className="block h-full rounded-full transition-[width] duration-150" style={{ width: `${Math.min(100, value)}%`, background: color }} />
      </dd>
    </div>
  );
}

function StageRibbon({ simulation, onSeek }: { simulation: SimulationResult; onSeek: (d: number) => void }) {
  const n = simulation.days.length;
  const colors = { initial: "bg-leaf-soft", development: "bg-leaf/40", mid: "bg-leaf/70", late: "bg-sun/60" } as const;
  return (
    <div className="mt-2 flex h-6 overflow-hidden rounded text-[11px]">
      {simulation.stages.map((s) => (
        <button
          key={s.key}
          type="button"
          onClick={() => onSeek(s.startDay)}
          title={s.description}
          className={cn("truncate px-1.5 text-left text-ink hover:brightness-95", colors[s.key])}
          style={{ width: `${((s.endDay - s.startDay + 1) / n) * 100}%` }}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

function YieldLimits({ factors }: { factors: SimulateResponse["analysis"]["yieldFactors"] }) {
  const { t } = useI18n();
  const entries = (Object.entries(factors) as [keyof typeof factors, number][]).filter(([, v]) => v < 0.99);
  if (entries.length === 0) return null;
  return (
    <div className="mt-5">
      <h4 className="text-sm font-semibold">{t("sim.yieldLimits")}</h4>
      <ul className="mt-2 space-y-2 text-sm">
        {entries.map(([k, v]) => (
          <li key={k} className="grid grid-cols-[10rem_1fr_3rem] items-center gap-2">
            <span className="text-ink-soft">{t(`sim.factor.${k}`)}</span>
            <span className="h-2 rounded-full bg-ink/8">
              <span className="block h-full rounded-full bg-sun" style={{ width: `${v * 100}%` }} />
            </span>
            <span className="text-right tabular">{Math.round(v * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
