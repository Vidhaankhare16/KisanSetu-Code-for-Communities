import React from "react";
import { Award, Check } from "lucide-react";
import type { SimulationResult } from "./types";
import type { SimulatorLabels } from "./labels";
import { SceneFrame } from "./SceneFrame";
import { formatIndianNumber, formatRupees } from "./utils";

interface CompareViewProps {
  primary: SimulationResult;
  secondary: SimulationResult;
  /** Crop names in the UI language. */
  primaryLabel: string;
  secondaryLabel: string;
  currentDayIndex: number;
  labels: SimulatorLabels;
}

interface Metric {
  label: string;
  a: number;
  b: number;
  format: (v: number) => string;
  /** Which direction is better; "none" shows the difference without naming a winner. */
  better: "higher" | "lower" | "none";
  /** Extra detail shown after each crop's value. */
  notes?: [string, string];
}

/** Two seasons side by side: both fields on the same day, then every outcome compared. */
export const CompareView: React.FC<CompareViewProps> = ({ primary, secondary, primaryLabel, secondaryLabel, currentDayIndex, labels }) => {
  const irrigations = (r: SimulationResult) => r.days.filter((d) => d.irrigationMm > 0).length;
  const mm = (v: number) => `${formatIndianNumber(Math.round(v))} mm`;
  const metrics: Metric[] = [
    { label: labels.metricProfit, a: primary.outcome.netProfitPerAcreInr, b: secondary.outcome.netProfitPerAcreInr, format: formatRupees, better: "higher" },
    {
      label: labels.metricYield,
      a: primary.outcome.expectedYieldQuintalPerAcre,
      b: secondary.outcome.expectedYieldQuintalPerAcre,
      format: (v) => `${v.toFixed(1)} ${labels.quintalPerAcre}`,
      // Quintals of different crops are not comparable, so yield names no winner.
      better: "none",
    },
    {
      label: labels.metricIrrigationNeeded,
      a: primary.outcome.totalIrrigationMm,
      b: secondary.outcome.totalIrrigationMm,
      format: mm,
      better: "lower",
      notes: [`${irrigations(primary)}×`, `${irrigations(secondary)}×`],
    },
    { label: labels.metricWaterNeeded, a: primary.outcome.totalCropWaterNeedMm, b: secondary.outcome.totalCropWaterNeedMm, format: mm, better: "lower" },
    { label: labels.metricRisk, a: primary.outcome.riskScore, b: secondary.outcome.riskScore, format: (v) => `${Math.round(v)} / 100`, better: "lower" },
    { label: labels.metricDuration, a: primary.durationDays, b: secondary.durationDays, format: (v) => `${v} ${labels.daysUnit}`, better: "none" },
  ];

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Scenario result={primary} name={primaryLabel} tag={labels.scenarioA} tone="text-leaf-deep" dayIndex={currentDayIndex} labels={labels} />
        <Scenario result={secondary} name={secondaryLabel} tag={labels.scenarioB} tone="text-water" dayIndex={currentDayIndex} labels={labels} />
      </div>

      <div className="w-full overflow-x-auto rounded-3xl border border-line bg-surface p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <Award className="h-5 w-5 text-[#8a5f00]" aria-hidden />
          <h3 className="text-base font-bold text-ink">{labels.compareScenarios}</h3>
        </div>

        <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs font-semibold text-ink-soft">
              <th className="pr-4 pb-3">{labels.metricHeader}</th>
              <th className="px-4 pb-3 font-bold text-leaf-deep">{primaryLabel}</th>
              <th className="px-4 pb-3 font-bold text-water">{secondaryLabel}</th>
              <th className="px-4 pb-3">{labels.differenceHeader}</th>
              <th className="pb-3 pl-4">{labels.winnerHeader}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line text-ink">
            {metrics.map((m) => {
              const winner = m.better === "none" || m.a === m.b ? null : (m.better === "higher") === m.a > m.b ? primaryLabel : secondaryLabel;
              return (
                <tr key={m.label}>
                  <td className="py-3 pr-4 font-medium">{m.label}</td>
                  <td className="px-4 py-3 tabular">
                    {m.format(m.a)}
                    {m.notes ? <span className="ml-1.5 text-xs text-ink-soft">{m.notes[0]}</span> : null}
                  </td>
                  <td className="px-4 py-3 tabular">
                    {m.format(m.b)}
                    {m.notes ? <span className="ml-1.5 text-xs text-ink-soft">{m.notes[1]}</span> : null}
                  </td>
                  <td className="px-4 py-3 text-ink-soft tabular">{m.format(Math.abs(m.a - m.b))}</td>
                  <td className="py-3 pl-4">
                    {winner ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-leaf/30 bg-leaf-soft px-2 py-0.5 text-xs font-semibold text-leaf-deep">
                        <Check className="h-3 w-3" aria-hidden />
                        {winner}
                      </span>
                    ) : (
                      <span className="text-ink-faint">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

function Scenario({
  result,
  name,
  tag,
  tone,
  dayIndex,
  labels,
}: {
  result: SimulationResult;
  name: string;
  tag: string;
  tone: string;
  dayIndex: number;
  labels: SimulatorLabels;
}) {
  const index = Math.min(dayIndex, result.durationDays - 1);
  const stage = result.stages.find((s) => index >= s.startDay && index <= s.endDay);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between px-1">
        <span className={`text-sm font-semibold ${tone}`}>
          {tag}: {name}
        </span>
        {dayIndex >= result.durationDays - 1 ? (
          <span className="rounded-full border border-sun/40 bg-sun-soft px-2 py-0.5 text-xs text-[#8a5f00]">
            {labels.harvestedBadge} ({result.durationDays} {labels.daysUnit})
          </span>
        ) : null}
      </div>
      <SceneFrame
        crop={result.crop}
        cropLabel={name}
        location={result.location}
        day={result.days[index]!}
        totalDays={result.durationDays}
        stage={stage}
        labels={labels}
        compact
      />
    </div>
  );
}
