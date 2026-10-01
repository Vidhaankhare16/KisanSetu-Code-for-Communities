"use client";

/**
 * A crop's season on the farmer's field: the verdict and money in a bad and a good year,
 * the interactive field simulator, and the analysis of why the season turns out this way.
 */
import type { SimulateResponse } from "@/contracts/api";
import type { SimulationResult } from "@/contracts/simulation";
import { Pill, TONE_BG, TONE_TEXT } from "@/components/ui/Tone";
import { CropIcon } from "@/features/crops/art/CropIcon";
import { useI18n } from "@/i18n/client";
import { cropLabel } from "@/i18n/crops";
import { cn } from "@/lib/cn";
import { inr, num, shortDate } from "@/lib/format";
import { EVENT_ICON, eventTone } from "./eventStyle";
import { SeasonInsights } from "./SeasonInsights";
import { CropSimulator } from "./studio/CropSimulator";
import { useSimulatorLabels } from "./useSimulatorLabels";

interface SeasonViewProps {
  simulation: SimulationResult;
  analysis?: SimulateResponse["analysis"];
  compareWith?: SimulationResult;
}

const VERDICT_TONE = { recommended: "leaf", caution: "sun", not_recommended: "alert" } as const;

export function SeasonView({ simulation, analysis, compareWith }: SeasonViewProps) {
  const { t, lang } = useI18n();
  const labels = useSimulatorLabels();
  const { outcome, ensemble } = simulation;
  const name = cropLabel(t, simulation.crop.id, simulation.crop.name);
  const pctOfPotential = Math.round((outcome.expectedYieldKgHa / outcome.potentialYieldKgHa) * 100);

  return (
    <article className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <CropIcon cropId={simulation.crop.id} category={simulation.crop.category} className="size-14" />
          <div>
            <h3 className="display text-2xl font-semibold">
              {name} <span className="font-normal text-ink-soft">({lang === "en" ? simulation.crop.localName : simulation.crop.name})</span>
            </h3>
            <p className="text-sm text-ink-soft">
              {simulation.location.name} · {shortDate(simulation.sowingDate, lang)} → {shortDate(simulation.harvestDate, lang)} · {simulation.durationDays}{" "}
              {t("common.days")}
            </p>
          </div>
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
        <Stat
          label={t("sim.expectedYield")}
          value={`${num(outcome.expectedYieldQuintalPerAcre, 1)} ${t("common.quintalPerAcre")}`}
          note={t("sim.ofPotential", { pct: pctOfPotential })}
          tone="leaf"
        />
        <Stat
          label={t("sim.netProfit")}
          value={inr(outcome.netProfitPerAcreInr)}
          note={ensemble ? t("sim.range", { low: inr(ensemble.netProfitPerAcreInr.p10), high: inr(ensemble.netProfitPerAcreInr.p90) }) : undefined}
          tone={outcome.netProfitPerAcreInr < 0 ? "alert" : "leaf"}
        />
        <Stat
          label={t("sim.waterUsed")}
          value={`${Math.round(outcome.totalIrrigationMm)} mm`}
          note={`${t("sim.rain")} ${Math.round(outcome.totalRainMm)} mm`}
          tone="water"
        />
        <Stat label={t("sim.regen")} value={`${outcome.regenerativeScore}/100`} note={`${t("sim.risk")} ${outcome.riskScore}/100`} tone="soil" />
      </dl>

      <CropSimulator
        key={simulation.id}
        result={simulation}
        compareWith={compareWith}
        labels={labels}
        cropLabel={name}
        compareLabel={compareWith ? cropLabel(t, compareWith.crop.id, compareWith.crop.name) : undefined}
      />

      {ensemble && ensemble.years.length > 1 ? (
        <p className="text-xs text-ink-soft">
          {t("sim.ensembleNote", { n: ensemble.members, from: Math.min(...ensemble.years), to: Math.max(...ensemble.years) })}
        </p>
      ) : null}

      {analysis ? (
        <section className="space-y-4">
          <h4 className="display text-xl font-semibold">{t("insights.title")}</h4>
          <SeasonInsights analysis={analysis} />
        </section>
      ) : null}

      <details className="rounded-panel border border-line bg-surface">
        <summary className="cursor-pointer px-4 py-3 font-semibold">{t("insights.allNotes")}</summary>
        <ol className="space-y-1 border-t border-line p-2">
          {simulation.events.map((e, i) => {
            const Icon = EVENT_ICON[e.type];
            const tone = eventTone(e.type, e.severity);
            return (
              <li key={`${e.type}-${e.day}-${i}`} className="flex gap-3 rounded-control p-2">
                <span className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full", TONE_BG[tone], TONE_TEXT[tone])}>
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs text-ink-soft tabular">{shortDate(e.date, lang)}</span>
                  <span className="block font-medium">{e.title}</span>
                  <span className="block text-sm text-ink-soft">{e.detail}</span>
                  {e.action ? <span className="mt-1 block text-sm">{e.action}</span> : null}
                </span>
              </li>
            );
          })}
        </ol>
      </details>
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
