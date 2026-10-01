import React from "react";
import { SimOutcome, SimNarrative, SimDataSource, SimCrop } from "./types";
import { SimulatorLabels } from "./labels";
import { formatRupees, formatIndianNumber } from "./utils";
import { Trophy, TrendingUp, Droplets, ShieldAlert, Sprout, CheckCircle2, AlertTriangle, XCircle, Database, Coins } from "lucide-react";

interface HarvestOutcomeCardProps {
  crop: SimCrop;
  /** Crop name in the UI language (falls back to the English name). */
  cropLabel?: string;
  outcome: SimOutcome;
  narrative?: SimNarrative;
  dataSources: SimDataSource[];
  labels: SimulatorLabels;
  /** Emphasise the card when playback has reached harvest. */
  highlight?: boolean;
}

export const HarvestOutcomeCard: React.FC<HarvestOutcomeCardProps> = ({ crop, cropLabel, outcome, narrative, dataSources, labels, highlight = false }) => {
  const {
    expectedYieldKgHa,
    potentialYieldKgHa,
    expectedYieldQuintalPerAcre,
    totalRainMm,
    totalIrrigationMm,
    costPerAcreInr,
    revenuePerAcreInr,
    netProfitPerAcreInr,
    pricePerQuintalInr,
    priceBasis,
    riskScore,
    regenerativeScore,
    verdict,
  } = outcome;

  const yieldAttainmentPct = potentialYieldKgHa > 0 ? Math.round((expectedYieldKgHa / potentialYieldKgHa) * 100) : 100;

  // Verdict config
  const getVerdictConfig = () => {
    switch (verdict) {
      case "recommended":
        return {
          text: labels.verdictRecommended,
          classes: "bg-leaf-soft text-leaf-deep border-leaf/30",
          icon: <CheckCircle2 className="w-4 h-4 text-leaf-deep" />,
        };
      case "caution":
        return {
          text: labels.verdictCaution,
          classes: "bg-sun-soft text-[#8a5f00] border-sun/40",
          icon: <AlertTriangle className="w-4 h-4 text-[#8a5f00]" />,
        };
      case "not_recommended":
      default:
        return {
          text: labels.verdictNotRecommended,
          classes: "bg-alert-soft text-alert border-alert/40",
          icon: <XCircle className="w-4 h-4 text-alert" />,
        };
    }
  };

  const verdictConfig = getVerdictConfig();

  return (
    <section
      className={`w-full rounded-panel bg-surface border p-5 sm:p-7 relative overflow-hidden flex flex-col gap-6 transition-shadow ${
        highlight ? "border-leaf shadow-[0_0_0_3px_var(--color-leaf-soft)]" : "border-line"
      }`}
    >
      {/* -------------------------------------------------------------
          HEADER ROW: Verdict & Title
      ------------------------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-sun-soft border border-sun/40 text-[#8a5f00]">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-ink tracking-wide">{labels.harvestProjection}</h2>
            <p className="text-xs text-ink-soft">
              {cropLabel ?? crop.name} ({crop.localName}) · {labels.faoModelNote}
            </p>
          </div>
        </div>

        {/* Verdict Badge */}
        <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold ${verdictConfig.classes}`}>
          {verdictConfig.icon}
          <span>{verdictConfig.text}</span>
        </div>
      </div>

      {/* -------------------------------------------------------------
          HERO FINANCIAL STATS: Big Net Profit + Yield
      ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
        {/* Card 1: Net Profit per Acre */}
        <div className="p-5 rounded-2xl bg-linear-to-br from-leaf-soft/70 via-leaf-soft/30 to-transparent border border-leaf/30 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-ink-soft font-medium">
            <span className="flex items-center gap-1.5 text-leaf-deep">
              <Coins className="w-4 h-4" />
              {labels.netProfit}
            </span>
            <span className="text-[11px] text-ink-soft">
              {labels.priceBasis}: {priceBasis}
            </span>
          </div>

          <div className="my-3">
            <div className="text-3xl sm:text-4xl font-extrabold tabular-nums tracking-tight text-leaf-deep">{formatRupees(netProfitPerAcreInr)}</div>
            <div className="text-xs text-ink-soft mt-1">
              {labels.mandiPrice}: {formatRupees(pricePerQuintalInr)} / q
            </div>
          </div>

          {/* Revenue vs Cost Micro-Bar */}
          <div className="pt-3 border-t border-line flex items-center justify-between text-xs">
            <div>
              <span className="text-ink-soft">{labels.grossRevenue}:</span> <strong className="text-ink tabular-nums">{formatRupees(revenuePerAcreInr)}</strong>
            </div>
            <div>
              <span className="text-ink-soft">{labels.cultivationCost}:</span>{" "}
              <strong className="text-alert tabular-nums">{formatRupees(costPerAcreInr)}</strong>
            </div>
          </div>
        </div>

        {/* Card 2: Expected Yield & Potential */}
        <div className="p-5 rounded-2xl bg-linear-to-br from-sun-soft/60 via-transparent to-transparent border border-sun/40 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-ink-soft font-medium">
            <span className="flex items-center gap-1.5 text-[#8a5f00]">
              <TrendingUp className="w-4 h-4" />
              {labels.expectedYield}
            </span>
            <span className="text-[11px] text-[#8a5f00] tabular">
              {yieldAttainmentPct}% {labels.yieldAttainment}
            </span>
          </div>

          <div className="my-3 flex items-baseline gap-2">
            <div className="text-3xl sm:text-4xl font-extrabold tabular-nums text-ink">{expectedYieldQuintalPerAcre}</div>
            <span className="text-sm text-ink-soft font-medium">{labels.quintalPerAcre}</span>
            <span className="text-xs text-ink-faint tabular ml-2">
              ({formatIndianNumber(expectedYieldKgHa)} {labels.kgPerHectare})
            </span>
          </div>

          <div className="pt-3 border-t border-line flex items-center justify-between text-xs">
            <span className="text-ink-soft">
              {labels.potentialYield}:{" "}
              <strong className="text-ink tabular-nums">
                {formatIndianNumber(potentialYieldKgHa)} {labels.kgPerHectare}
              </strong>
            </span>
            <span className="text-[11px] text-[#8a5f00]/90">
              {labels.yieldGap}: {formatIndianNumber(potentialYieldKgHa - expectedYieldKgHa)} {labels.kgPerHectare}
            </span>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------
          WATER BALANCE & SUSTAINABILITY METRICS
      ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 relative z-10">
        {/* Water Budget */}
        <div className="p-4 rounded-xl bg-mist border border-line">
          <div className="flex items-center gap-1.5 text-xs text-water mb-1">
            <Droplets className="w-3.5 h-3.5" />
            <span className="font-semibold">{labels.waterBalance}</span>
          </div>
          <div className="text-xl font-bold tabular-nums text-ink">
            {Math.round(totalIrrigationMm + totalRainMm)} <span className="text-xs font-normal text-ink-soft">{labels.waterTotal}</span>
          </div>
          <div className="text-[11px] text-ink-soft mt-1 flex justify-between">
            <span>
              {labels.cumulativeRain}: {Math.round(totalRainMm)} mm
            </span>
            <span>
              {labels.cumulativeIrrigation}: {Math.round(totalIrrigationMm)} mm
            </span>
          </div>
        </div>

        {/* Climate Risk Index */}
        <div className="p-4 rounded-xl bg-mist border border-line">
          <div className="flex items-center gap-1.5 text-xs text-[#8a5f00] mb-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span className="font-semibold">{labels.riskIndex}</span>
          </div>
          <div className="text-xl font-bold tabular-nums text-ink">
            {riskScore} <span className="text-xs font-normal text-ink-soft">/ 100</span>
          </div>
          <div className="mt-1 w-full h-1.5 rounded-full bg-ink/10 overflow-hidden">
            <div
              style={{ width: `${riskScore}%` }}
              className={`h-full rounded-full ${riskScore > 50 ? "bg-alert" : riskScore > 30 ? "bg-sun" : "bg-leaf-deep"}`}
            />
          </div>
        </div>

        {/* Regenerative Soil Score */}
        <div className="p-4 rounded-xl bg-mist border border-line">
          <div className="flex items-center gap-1.5 text-xs text-leaf-deep mb-1">
            <Sprout className="w-3.5 h-3.5" />
            <span className="font-semibold">{labels.regenerativeScore}</span>
          </div>
          <div className="text-xl font-bold tabular-nums text-leaf-deep">
            {regenerativeScore} <span className="text-xs font-normal text-ink-soft">/ 100</span>
          </div>
          <div className="mt-1 w-full h-1.5 rounded-full bg-ink/10 overflow-hidden">
            <div style={{ width: `${regenerativeScore}%` }} className="h-full rounded-full bg-leaf-deep" />
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------
          NARRATIVE HEADLINE & BULLETS
      ------------------------------------------------------------- */}
      {narrative && (
        <div className="p-4 rounded-2xl bg-surface/90 border border-line relative z-10">
          <h4 className="text-xs font-bold uppercase tracking-wider text-leaf-deep mb-2">
            {labels.keyInsights}: {narrative.headline}
          </h4>
          <ul className="space-y-1.5 text-xs text-ink-soft">
            {narrative.bullets.map((bullet, i) => (
              <li key={`bullet-${i}`} className="flex items-start gap-2">
                <span className="text-leaf-deep mt-0.5">•</span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* -------------------------------------------------------------
          DATA SOURCES FOOTER CHIPS
      ------------------------------------------------------------- */}
      <div className="pt-3 border-t border-line flex flex-wrap items-center justify-between gap-2 relative z-10 text-[11px] text-ink-soft">
        <div className="flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-ink-faint" />
          <span className="font-medium">{labels.dataSources}:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {dataSources.map((ds, idx) => (
            <span key={`ds-${idx}`} className="text-ink-soft bg-mist px-2.5 py-0.5 rounded-md border border-line">
              {ds.name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};
