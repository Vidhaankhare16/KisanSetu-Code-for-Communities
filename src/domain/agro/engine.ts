/**
 * Daily crop-season simulation for a single weather scenario.
 *
 * Model structure (deliberately transparent so agronomists can audit it):
 * 1. Phenology — thermal time (growing degree days) drives progress through the four
 *    FAO-56 stages; season length adapts to the local temperature regime.
 * 2. Water — FAO-56 single crop coefficient with a root-zone water balance
 *    (TAW/RAW, water-stress coefficient Ks, growing roots, effective rainfall, drainage).
 * 3. Irrigation — a policy derived from the farmer's water access and method.
 * 4. Stress — heat and cold damage in sensitive stages, soil pH and salinity limits.
 * 5. Yield — FAO-33 yield response to stage-weighted evapotranspiration deficits,
 *    multiplied by temperature, heat, cold and soil factors.
 */
import type { IrrigationMethod, SoilCard, SoilTexture, WaterAccess } from "@/contracts/farm";
import type { SimDay, SimStage, StageKey } from "@/contracts/simulation";
import type { CropModel } from "@/domain/crops/types";
import { availableWaterPerMetre } from "./soil";
import type { WeatherScenario } from "./weather";

export const STAGE_KEYS: readonly StageKey[] = ["initial", "development", "mid", "late"];

/** Relative importance of a water deficit in each stage (sums to 1), after FAO-33. */
const STAGE_WATER_WEIGHTS: Record<StageKey, number> = {
  initial: 0.1,
  development: 0.25,
  mid: 0.45,
  late: 0.2,
};

const IRRIGATION_EFFICIENCY: Record<IrrigationMethod, number> = {
  flood: 0.6,
  sprinkler: 0.75,
  drip: 0.9,
};

/**
 * Smallest practical gross application per irrigation (mm). A flooded field cannot be
 * wetted evenly with less, so frequent light irrigations waste water under flood.
 */
const MIN_APPLICATION_MM: Record<IrrigationMethod, number> = {
  flood: 50,
  sprinkler: 25,
  drip: 0,
};

/** Water pumped (gross) to deliver `netMm` to the root zone with the given method. */
export function grossIrrigation(netMm: number, method: IrrigationMethod): number {
  if (netMm <= 0) return 0;
  return Math.max(netMm / IRRIGATION_EFFICIENCY[method], MIN_APPLICATION_MM[method]);
}

/** Maximum number of in-season irrigations when water access is "limited". */
export const LIMITED_IRRIGATIONS = 3;
const MIN_ROOT_DEPTH_M = 0.15;
const MAX_CANOPY_COVER = 0.95;
const DRY_SPELL_MIN_DAYS = 7;

export interface FieldConditions {
  texture: SoilTexture;
  soilCard?: SoilCard;
  water: WaterAccess;
  irrigationMethod: IrrigationMethod;
  /** Fraction of plant-available water present in the root zone at sowing (0..1). */
  initialMoistureFraction: number;
}

export interface YieldFactors {
  water: number;
  temperature: number;
  heat: number;
  cold: number;
  soil: number;
  maturity: number;
}

export interface SeasonRun {
  days: SimDay[];
  stages: SimStage[];
  durationDays: number;
  matured: boolean;
  totals: {
    rainMm: number;
    effectiveRainMm: number;
    cropWaterNeedMm: number;
    actualEtMm: number;
    irrigationNetMm: number;
    irrigationGrossMm: number;
    irrigationCount: number;
    drainageMm: number;
  };
  heatDegreeDays: number;
  coldDegreeDays: number;
  drySpells: { startDay: number; endDay: number }[];
  potentialYieldKgHa: number;
  expectedYieldKgHa: number;
  yieldFactors: YieldFactors;
}

/** Thermal time accumulated in one day (°C·day), capped at the optimum ceiling. */
export function dailyThermalTime(crop: CropModel, tMax: number, tMin: number): number {
  const tMean = (tMax + tMin) / 2;
  const { base, optHigh } = crop.temperature;
  return Math.max(0, Math.min(tMean, optHigh) - base);
}

/**
 * Thermal time to maturity. Calibrated so the crop matures in its nominal duration when the
 * daily mean sits a quarter of the way into its optimal band (typical of the main season).
 */
export function thermalTimeToMaturity(crop: CropModel): number {
  const { base, optLow, optHigh } = crop.temperature;
  const reference = optLow + 0.25 * (optHigh - optLow);
  return crop.durationDays * (reference - base);
}

/** Crop coefficient for a given progress fraction (FAO-56 Fig. 25 shape). */
export function cropCoefficient(crop: CropModel, progress: number): number {
  const [fIni, fDev, fMid] = crop.stageFractions;
  const { ini, mid, end } = crop.kc;
  if (progress <= fIni) return ini;
  if (progress <= fIni + fDev) return ini + ((progress - fIni) / fDev) * (mid - ini);
  if (progress <= fIni + fDev + fMid) return mid;
  const fLate = 1 - fIni - fDev - fMid;
  return mid + (Math.min(1, (progress - fIni - fDev - fMid) / fLate) * (end - mid));
}

export function stageAt(crop: CropModel, progress: number): StageKey {
  const [fIni, fDev, fMid] = crop.stageFractions;
  if (progress < fIni) return "initial";
  if (progress < fIni + fDev) return "development";
  if (progress < fIni + fDev + fMid) return "mid";
  return "late";
}

/** Relative growth rate response to daily mean temperature (trapezoid on cardinal temps). */
export function temperatureResponse(crop: CropModel, tMean: number): number {
  const { base, optLow, optHigh, max } = crop.temperature;
  if (tMean <= base || tMean >= max) return 0;
  if (tMean < optLow) return (tMean - base) / (optLow - base);
  if (tMean <= optHigh) return 1;
  return (max - tMean) / (max - optHigh);
}

/** Cumulative logistic growth curve normalised to 0..1 over crop progress. */
function growthCurve(progress: number): number {
  const k = 10;
  const mid = 0.55;
  const raw = (p: number) => 1 / (1 + Math.exp(-k * (p - mid)));
  return (raw(progress) - raw(0)) / (raw(1) - raw(0));
}

function potentialCanopy(crop: CropModel, progress: number): number {
  const [fIni, fDev, fMid] = crop.stageFractions;
  const ccMax = crop.category === "vegetable" ? 0.85 : MAX_CANOPY_COVER;
  if (progress <= fIni) return 0.02 + (progress / fIni) * 0.1;
  if (progress <= fIni + fDev) {
    const x = (progress - fIni) / fDev;
    return 0.12 + (ccMax - 0.12) * (x * x * (3 - 2 * x));
  }
  if (progress <= fIni + fDev + fMid) return ccMax;
  const fLate = 1 - fIni - fDev - fMid;
  const x = Math.min(1, (progress - fIni - fDev - fMid) / fLate);
  return ccMax * (1 - 0.45 * x);
}

function plantHeight(crop: CropModel, progress: number): number {
  const [fIni, fDev, fMid] = crop.stageFractions;
  const fullAt = fIni + fDev + 0.5 * fMid;
  const x = Math.min(1, progress / fullAt);
  return crop.maxHeightCm * (0.03 + 0.97 * x * x * (3 - 2 * x));
}

/** Rainfall that actually enters the root zone (mm). */
export function effectiveRainfall(rainMm: number): number {
  if (rainMm < 2) return rainMm * 0.5; // intercepted and evaporated from the canopy
  if (rainMm <= 50) return rainMm;
  return 50 + (rainMm - 50) * 0.5; // intense storms lose part to runoff
}

/** Heat and cold only hurt yield in the crop's sensitive stages. */
function isHeatSensitive(crop: CropModel, stage: StageKey): boolean {
  if (stage === "mid") return true;
  return stage === "late" && (crop.category === "cereal" || crop.category === "millet");
}

function isColdSensitive(stage: StageKey): boolean {
  return stage === "development" || stage === "mid";
}

function soilFactor(crop: CropModel, card: SoilCard | undefined): number {
  if (!card) return 1;
  const [phLow, phHigh] = crop.phRange;
  const phDistance = card.pH < phLow ? phLow - card.pH : card.pH > phHigh ? card.pH - phHigh : 0;
  const phFactor = 1 - Math.min(0.5, 0.12 * phDistance);
  const ecExcess = Math.max(0, card.electricalConductivity - crop.salinityToleranceEc);
  const ecFactor = 1 - Math.min(0.6, 0.15 * ecExcess);
  return phFactor * ecFactor;
}

function irrigationAllowed(water: WaterAccess, stage: StageKey, used: number): boolean {
  if (water === "rainfed") return false;
  if (water === "assured") return true;
  return used < LIMITED_IRRIGATIONS && (stage === "development" || stage === "mid");
}

export function simulateSeason(
  crop: CropModel,
  field: FieldConditions,
  scenario: WeatherScenario,
): SeasonRun {
  const awcPerMetre = availableWaterPerMetre(field.texture);
  const gddRequired = thermalTimeToMaturity(crop);
  const maxDays = Math.min(scenario.days.length, Math.ceil(crop.durationDays * 1.4));
  const potentialBiomass = crop.potentialYieldKgHa / crop.harvestIndex;
  const [fIni, fDev] = crop.stageFractions;

  const initialFraction = clamp01(field.initialMoistureFraction);
  let rootDepth = MIN_ROOT_DEPTH_M;
  let taw = awcPerMetre * rootDepth;
  let depletion = taw * (1 - initialFraction);
  // Deeper soil entered by growing roots is assumed to hold the initial moisture state.
  const deepSoilFraction = initialFraction;

  let gdd = 0;
  let biomass = 0;
  let irrigationCount = 0;
  let heatDegreeDays = 0;
  let coldDegreeDays = 0;
  let matured = false;
  const recentKs: number[] = [];
  const stageEtc: Record<StageKey, number> = { initial: 0, development: 0, mid: 0, late: 0 };
  const stageEta: Record<StageKey, number> = { initial: 0, development: 0, mid: 0, late: 0 };
  const stageTempSum: Record<StageKey, { sum: number; n: number }> = {
    initial: { sum: 0, n: 0 },
    development: { sum: 0, n: 0 },
    mid: { sum: 0, n: 0 },
    late: { sum: 0, n: 0 },
  };
  const totals: SeasonRun["totals"] = {
    rainMm: 0,
    effectiveRainMm: 0,
    cropWaterNeedMm: 0,
    actualEtMm: 0,
    irrigationNetMm: 0,
    irrigationGrossMm: 0,
    irrigationCount: 0,
    drainageMm: 0,
  };
  const days: SimDay[] = [];

  // Pre-sowing irrigation ("palewa") brings a dry seedbed to field capacity where water exists.
  let preSowingNet = 0;
  if (field.water !== "rainfed" && initialFraction < 0.7) {
    preSowingNet = depletion;
    depletion = 0;
  }

  for (let d = 0; d < maxDays; d++) {
    const w = scenario.days[d]!;
    const tMean = (w.tMax + w.tMin) / 2;
    const progressBefore = Math.min(1, gdd / gddRequired);
    gdd += dailyThermalTime(crop, w.tMax, w.tMin);
    const progress = Math.min(1, gdd / gddRequired);
    const stage = stageAt(crop, progress);

    // Roots deepen through the initial and development stages.
    const newRootDepth =
      MIN_ROOT_DEPTH_M + (crop.rootDepthM - MIN_ROOT_DEPTH_M) * Math.min(1, progress / (fIni + fDev));
    if (newRootDepth > rootDepth) {
      const addedTaw = awcPerMetre * (newRootDepth - rootDepth);
      depletion += addedTaw * (1 - deepSoilFraction);
      rootDepth = newRootDepth;
      taw = awcPerMetre * rootDepth;
    }

    const kc = cropCoefficient(crop, progress);
    const etc = kc * w.et0;
    // FAO-56 adjusts p for evaporative demand (Annex 8): p = p_table + 0.04 (5 - ETc).
    const p = Math.min(0.8, Math.max(0.1, crop.depletionFraction + 0.04 * (5 - etc)));
    const raw = p * taw;

    let irrigationNet = d === 0 ? preSowingNet : 0;
    const nearMaturity = progress > 0.92;
    const rainExpected = w.rain >= 10;
    if (
      !nearMaturity &&
      !rainExpected &&
      depletion >= raw &&
      irrigationAllowed(field.water, stage, irrigationCount)
    ) {
      irrigationNet += depletion;
      depletion = 0;
      irrigationCount++;
    }

    const effectiveRain = effectiveRainfall(w.rain);
    depletion -= effectiveRain;
    let drainage = 0;
    if (depletion < 0) {
      drainage = -depletion;
      depletion = 0;
    }

    const ks = depletion > raw ? Math.max(0, (taw - depletion) / ((1 - p) * taw)) : 1;
    const eta = ks * etc;
    depletion = Math.min(taw, depletion + eta);

    // Stress indices (0 = none, 1 = severe).
    const heatExcess = Math.max(0, w.tMax - crop.heatStressC);
    const coldDeficit = Math.max(0, crop.coldStressC - w.tMin);
    if (isHeatSensitive(crop, stage)) heatDegreeDays += heatExcess;
    if (isColdSensitive(stage)) coldDegreeDays += coldDeficit;
    const thermalStress = Math.min(1, Math.max(heatExcess / 5, coldDeficit / 4));

    recentKs.push(ks);
    if (recentKs.length > 7) recentKs.shift();
    const ks7 = recentKs.reduce((a, b) => a + b, 0) / recentKs.length;

    const growth =
      potentialBiomass * (growthCurve(progress) - growthCurve(progressBefore)) * ks * temperatureResponse(crop, tMean);
    biomass += Math.max(0, growth);

    stageEtc[stage] += etc;
    stageEta[stage] += eta;
    stageTempSum[stage].sum += tMean;
    stageTempSum[stage].n += 1;
    totals.rainMm += w.rain;
    totals.effectiveRainMm += effectiveRain;
    totals.cropWaterNeedMm += etc;
    totals.actualEtMm += eta;
    totals.drainageMm += drainage;
    const irrigationGross = grossIrrigation(irrigationNet, field.irrigationMethod);
    if (irrigationNet > 0) {
      totals.irrigationNetMm += irrigationNet;
      totals.irrigationGrossMm += irrigationGross;
    }

    days.push({
      day: d,
      date: w.date,
      stage,
      progress: round(progress, 3),
      canopyCover: round(potentialCanopy(crop, progress) * (0.55 + 0.45 * ks7), 3),
      plantHeightCm: round(plantHeight(crop, progress), 1),
      biomassKgHa: Math.round(biomass),
      tMaxC: round(w.tMax, 1),
      tMinC: round(w.tMin, 1),
      rainMm: round(w.rain, 1),
      et0Mm: round(w.et0, 2),
      etcMm: round(etc, 2),
      soilMoisturePct: round((100 * (taw - depletion)) / taw, 1),
      irrigationMm: round(irrigationGross, 1),
      waterStress: round(1 - ks, 3),
      heatStress: round(thermalStress, 3),
      health: Math.round(100 * clamp01(0.65 * ks7 + 0.35 * (1 - thermalStress))),
      weatherSource: w.source,
    });

    if (progress >= 1) {
      matured = true;
      break;
    }
  }

  totals.irrigationCount = irrigationCount + (preSowingNet > 0 ? 1 : 0);
  const finalProgress = days.at(-1)?.progress ?? 0;

  const waterDeficit = STAGE_KEYS.reduce((acc, key) => {
    if (stageEtc[key] <= 0) return acc;
    return acc + STAGE_WATER_WEIGHTS[key] * (1 - stageEta[key] / stageEtc[key]);
  }, 0);
  const growingTemps = [stageTempSum.development, stageTempSum.mid].filter((s) => s.n > 0);
  const growingMean = growingTemps.length
    ? growingTemps.reduce((a, s) => a + s.sum, 0) / growingTemps.reduce((a, s) => a + s.n, 0)
    : crop.temperature.optLow;

  const yieldFactors: YieldFactors = {
    water: clamp01(1 - crop.ky * waterDeficit),
    temperature: seasonalTemperatureFactor(crop, growingMean),
    heat: 1 - Math.min(0.6, 0.015 * heatDegreeDays),
    cold: 1 - Math.min(0.5, 0.03 * coldDegreeDays),
    soil: soilFactor(crop, field.soilCard),
    maturity: matured ? 1 : finalProgress * finalProgress,
  };
  const combined = Object.values(yieldFactors).reduce((a, b) => a * b, 1);

  return {
    days,
    stages: buildStages(crop, days),
    durationDays: days.length,
    matured,
    totals: roundTotals(totals),
    heatDegreeDays: round(heatDegreeDays, 1),
    coldDegreeDays: round(coldDegreeDays, 1),
    drySpells: findDrySpells(days),
    potentialYieldKgHa: crop.potentialYieldKgHa,
    expectedYieldKgHa: Math.round(crop.potentialYieldKgHa * combined),
    yieldFactors: mapValues(yieldFactors, (v) => round(v, 3)),
  };
}

/** How well the season's growing temperatures suit the crop (1 inside the optimal band). */
export function seasonalTemperatureFactor(crop: CropModel, tMean: number): number {
  const { base, optLow, optHigh, max } = crop.temperature;
  if (tMean >= optLow && tMean <= optHigh) return 1;
  if (tMean < optLow) return clamp01((tMean - (base + 2)) / (optLow - (base + 2)));
  return clamp01((max - tMean) / (max - optHigh));
}

function buildStages(crop: CropModel, days: SimDay[]): SimStage[] {
  const stages: SimStage[] = [];
  STAGE_KEYS.forEach((key, i) => {
    const inStage = days.filter((d) => d.stage === key);
    if (inStage.length === 0) return;
    stages.push({
      key,
      label: crop.stageLabels[i]!,
      startDay: inStage[0]!.day,
      endDay: inStage.at(-1)!.day,
      description: crop.stageNotes[i]!,
    });
  });
  return stages;
}

/** Runs of consecutive days where the crop sits below its water-stress threshold. */
export function findDrySpells(days: SimDay[]): { startDay: number; endDay: number }[] {
  const spells: { startDay: number; endDay: number }[] = [];
  let start = -1;
  days.forEach((d, i) => {
    const stressed = d.waterStress > 0.05;
    if (stressed && start < 0) start = i;
    if ((!stressed || i === days.length - 1) && start >= 0) {
      const end = stressed ? i : i - 1;
      if (end - start + 1 >= DRY_SPELL_MIN_DAYS) spells.push({ startDay: start, endDay: end });
      start = -1;
    }
  });
  return spells;
}

function roundTotals(t: SeasonRun["totals"]): SeasonRun["totals"] {
  return mapValues(t, (v) => Math.round(v));
}

function mapValues<T extends object>(obj: T, fn: (v: number) => number): T {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, fn(v as number)])) as T;
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function round(v: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}
