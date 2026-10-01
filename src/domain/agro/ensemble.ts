/**
 * Runs the crop engine across an ensemble of weather scenarios (forecast + each of the
 * last N years' observed weather) and condenses it into one simulator-ready result with
 * probabilistic outcomes. The trace shown to the farmer is the median-yield member, so
 * the animation and the headline numbers always agree.
 */
import type { Place } from "@/contracts/farm";
import type { EnsembleSummary, Percentiles, SimDataSource, SimulationResult, Verdict } from "@/contracts/simulation";
import type { CropModel } from "@/domain/crops/types";
import { stableHash } from "@/domain/hash";
import { computeEconomics, type Economics, kgPerHaToQuintalPerAcre, priceMultipliers } from "./economics";
import { simulateSeason, type FieldConditions, type SeasonRun, type YieldFactors } from "./engine";
import { buildEvents } from "./events";
import { assessRegenerative, type RegenerativeAssessment } from "./regenerative";
import type { WeatherScenario } from "./weather";

export interface EnsembleRequest {
  crop: CropModel;
  place: Place;
  sowingDate: string;
  field: FieldConditions;
  scenarios: readonly WeatherScenario[];
  dataSources: readonly SimDataSource[];
  previousCropId?: string;
}

export interface EnsembleMember {
  scenarioId: string;
  year?: number;
  yieldKgHa: number;
  netProfitPerAcreInr: number;
  irrigationGrossMm: number;
  matured: boolean;
  drySpellDays: number;
  heatDegreeDays: number;
  coldDegreeDays: number;
}

/** Extra explanation that travels alongside the simulation (for the UI and AI grounding). */
export interface SimulationAnalysis {
  yieldFactors: YieldFactors;
  economics: Economics;
  regenerative: RegenerativeAssessment;
  waterBalance: SeasonRun["totals"];
  members: EnsembleMember[];
}

export interface EnsembleResult {
  simulation: SimulationResult;
  analysis: SimulationAnalysis;
}

export function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (rank - lo);
}

function percentiles(values: readonly number[]): Percentiles {
  return {
    p10: Math.round(percentile(values, 10)),
    p50: Math.round(percentile(values, 50)),
    p90: Math.round(percentile(values, 90)),
  };
}

/**
 * 0-100 risk: chance of losing money (across weather years and price scenarios),
 * year-to-year yield volatility, and how often the season brings damaging dry spells or
 * temperature extremes.
 */
export function riskScore(members: readonly EnsembleMember[], profitSamples: readonly number[] = members.map((m) => m.netProfitPerAcreInr)): number {
  if (members.length === 0) return 100;
  const n = members.length;
  const probLoss = profitSamples.filter((p) => p < 0).length / Math.max(1, profitSamples.length);
  const yields = members.map((m) => m.yieldKgHa);
  const meanYield = yields.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(yields.reduce((a, y) => a + (y - meanYield) ** 2, 0) / n);
  const cv = meanYield > 0 ? sd / meanYield : 1;
  const probDry = members.filter((m) => m.drySpellDays >= 14).length / n;
  const probThermal = members.filter((m) => m.heatDegreeDays > 5 || m.coldDegreeDays > 5).length / n;
  const probImmature = members.filter((m) => !m.matured).length / n;
  const score = 40 * probLoss + 30 * Math.min(1, cv / 0.4) + 15 * probDry + 15 * probThermal;
  return Math.round(Math.min(100, score + 40 * probImmature));
}

export interface VerdictInput {
  profitP10: number;
  profitP50: number;
  risk: number;
  yieldRatio: number;
  matured: boolean;
}

/**
 * Recommended only when the crop matures, pays in a typical year, still breaks even in a
 * bad year (P10), and its overall risk is moderate.
 */
export function verdictFor({ profitP10, profitP50, risk, yieldRatio, matured }: VerdictInput): Verdict {
  if (!matured || profitP50 <= 0 || yieldRatio < 0.35) return "not_recommended";
  if (risk < 45 && yieldRatio >= 0.5 && profitP10 >= 0) return "recommended";
  return "caution";
}

export function runEnsemble(req: EnsembleRequest): EnsembleResult {
  if (req.scenarios.length === 0) throw new Error("runEnsemble needs at least one weather scenario");
  const { crop, field } = req;

  const runs = req.scenarios.map((scenario) => {
    const run = simulateSeason(crop, field, scenario);
    const econ = computeEconomics(crop, run.expectedYieldKgHa, run.totals.irrigationGrossMm, field.soilCard);
    const member: EnsembleMember = {
      scenarioId: scenario.id,
      year: scenario.year,
      yieldKgHa: run.expectedYieldKgHa,
      netProfitPerAcreInr: econ.netProfitPerAcreInr,
      irrigationGrossMm: run.totals.irrigationGrossMm,
      matured: run.matured,
      drySpellDays: run.drySpells.reduce((a, s) => a + s.endDay - s.startDay + 1, 0),
      heatDegreeDays: run.heatDegreeDays,
      coldDegreeDays: run.coldDegreeDays,
    };
    return { scenario, run, econ, member };
  });

  // Representative member = the lower-middle yield, so its trace *is* the P50 season.
  const byYield = [...runs].sort((a, b) => a.member.yieldKgHa - b.member.yieldKgHa);
  const rep = byYield[Math.floor((byYield.length - 1) / 2)]!;
  const members = runs.map((r) => r.member);

  // Profit uncertainty = weather years × low / reference / high price scenarios.
  const profitSamples = runs.flatMap(({ run }) =>
    priceMultipliers(crop).map((m) => computeEconomics(crop, run.expectedYieldKgHa, run.totals.irrigationGrossMm, field.soilCard, m).netProfitPerAcreInr),
  );
  const risk = riskScore(members, profitSamples);
  const regenerative = assessRegenerative(crop, rep.run.totals.irrigationGrossMm, req.previousCropId);
  const yieldRatio = rep.run.expectedYieldKgHa / crop.potentialYieldKgHa;
  const profitP50 = percentile(profitSamples, 50);
  const n = members.length;

  const ensemble: EnsembleSummary = {
    members: n,
    years: members.flatMap((m) => (m.year ? [m.year] : [])),
    yieldKgHa: percentiles(members.map((m) => m.yieldKgHa)),
    netProfitPerAcreInr: percentiles(profitSamples),
    irrigationMm: percentiles(members.map((m) => m.irrigationGrossMm)),
    probDrySpell: round2(members.filter((m) => m.drySpellDays >= 7).length / n),
    probHeatStress: round2(members.filter((m) => m.heatDegreeDays > 0).length / n),
    probColdStress: round2(members.filter((m) => m.coldDegreeDays > 0).length / n),
    probLoss: round2(profitSamples.filter((p) => p < 0).length / profitSamples.length),
  };

  const { run, econ, scenario } = rep;
  const simulation: SimulationResult = {
    id: simulationId(req),
    crop: { id: crop.id, name: crop.name, localName: crop.localName, category: crop.category },
    location: req.place,
    sowingDate: req.sowingDate,
    harvestDate: run.days.at(-1)!.date,
    durationDays: run.durationDays,
    stages: run.stages,
    days: run.days,
    events: buildEvents({ crop, run, weather: scenario.days, water: field.water, soilCard: field.soilCard }),
    outcome: {
      expectedYieldKgHa: run.expectedYieldKgHa,
      potentialYieldKgHa: crop.potentialYieldKgHa,
      expectedYieldQuintalPerAcre: Math.round(kgPerHaToQuintalPerAcre(run.expectedYieldKgHa) * 10) / 10,
      totalRainMm: run.totals.rainMm,
      totalIrrigationMm: run.totals.irrigationGrossMm,
      totalCropWaterNeedMm: run.totals.cropWaterNeedMm,
      costPerAcreInr: econ.costPerAcreInr,
      revenuePerAcreInr: econ.revenuePerAcreInr,
      netProfitPerAcreInr: econ.netProfitPerAcreInr,
      pricePerQuintalInr: crop.price.perQuintalInr,
      priceBasis: crop.price.basis,
      riskScore: risk,
      regenerativeScore: regenerative.score,
      verdict: verdictFor({
        profitP10: percentile(profitSamples, 10),
        profitP50,
        risk,
        yieldRatio,
        matured: run.matured,
      }),
    },
    dataSources: [...req.dataSources],
    ensemble,
  };

  return {
    simulation,
    analysis: {
      yieldFactors: run.yieldFactors,
      economics: econ,
      regenerative,
      waterBalance: run.totals,
      members,
    },
  };
}

function simulationId(req: EnsembleRequest): string {
  return `sim_${stableHash({
    crop: req.crop.id,
    lat: req.place.lat.toFixed(3),
    lon: req.place.lon.toFixed(3),
    sow: req.sowingDate,
    field: req.field,
    prev: req.previousCropId,
    years: req.scenarios.map((s) => s.year ?? s.id),
  })}`;
}

const round2 = (v: number) => Math.round(v * 100) / 100;
