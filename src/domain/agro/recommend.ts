/**
 * Crop recommendation: simulate every crop whose sowing window fits the date, then rank
 * them with a transparent multi-criteria score whose weights follow the farmer's priority.
 */
import type { FarmerPriority } from "@/contracts/farm";
import { CROPS } from "@/domain/crops/catalog";
import type { CropModel } from "@/domain/crops/types";
import { distanceToWindow } from "@/domain/time";
import { runEnsemble, type EnsembleRequest, type EnsembleResult } from "./ensemble";

/** A crop is a candidate if the sowing date is within this many days of its window. */
export const SOWING_TOLERANCE_DAYS = 15;

type Criterion = "profit" | "downside" | "water" | "soil" | "stability";

export const PRIORITY_WEIGHTS: Record<FarmerPriority, Record<Criterion, number>> = {
  balanced: { profit: 0.3, downside: 0.2, water: 0.15, soil: 0.15, stability: 0.2 },
  profit: { profit: 0.5, downside: 0.2, water: 0.05, soil: 0.05, stability: 0.2 },
  low_risk: { profit: 0.15, downside: 0.35, water: 0.1, soil: 0.1, stability: 0.3 },
  save_water: { profit: 0.2, downside: 0.15, water: 0.4, soil: 0.1, stability: 0.15 },
  soil_health: { profit: 0.2, downside: 0.15, water: 0.15, soil: 0.4, stability: 0.1 },
};

export interface RankedCrop {
  rank: number;
  score: number;
  criteria: Record<Criterion, number>;
  result: EnsembleResult;
}

export interface CandidateOptions {
  /**
   * Vegetables are market-limited (perishable, need a nearby mandi or cold storage, and prices
   * crash when many farmers plant them), so they are only offered when the farmer opts in.
   */
  includeVegetables?: boolean;
  pool?: readonly CropModel[];
}

export function candidateCrops(sowingDate: string, { includeVegetables = false, pool = CROPS }: CandidateOptions = {}): CropModel[] {
  return pool.filter(
    (crop) =>
      (includeVegetables || crop.category !== "vegetable") &&
      crop.sowingWindows.some((w) => distanceToWindow(sowingDate, w.from, w.to) <= SOWING_TOLERANCE_DAYS),
  );
}

export function rankCrops(
  base: Omit<EnsembleRequest, "crop">,
  priority: FarmerPriority,
  crops: readonly CropModel[] = candidateCrops(base.sowingDate),
): RankedCrop[] {
  const results = crops.map((crop) => runEnsemble({ ...base, crop }));
  if (results.length === 0) return [];

  const profit = results.map((r) => r.simulation.ensemble!.netProfitPerAcreInr.p50);
  const downside = results.map((r) => r.simulation.ensemble!.netProfitPerAcreInr.p10);
  const water = results.map((r) => -r.simulation.ensemble!.irrigationMm.p50);
  const weights = PRIORITY_WEIGHTS[priority];

  const ranked = results.map((result, i) => {
    const criteria: Record<Criterion, number> = {
      profit: normalise(profit, i),
      downside: normalise(downside, i),
      water: normalise(water, i),
      soil: result.simulation.outcome.regenerativeScore / 100,
      stability: 1 - result.simulation.outcome.riskScore / 100,
    };
    let score = (Object.keys(weights) as Criterion[]).reduce((acc, k) => acc + weights[k] * criteria[k], 0);
    // A crop that loses money or cannot mature never outranks a viable one.
    if (result.simulation.outcome.verdict === "not_recommended") score *= 0.4;
    return { rank: 0, score: Math.round(score * 100), criteria: roundAll(criteria), result };
  });

  return ranked
    .sort((a, b) => b.score - a.score)
    .map((r, i) => ({ ...r, rank: i + 1 }));
}

/** Min-max normalisation of `values[i]` to 0..1 (1 when all values are equal). */
function normalise(values: readonly number[], i: number): number {
  const min = Math.min(...values);
  const max = Math.max(...values);
  return max === min ? 1 : (values[i]! - min) / (max - min);
}

function roundAll<T extends Record<string, number>>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, Math.round(v * 100) / 100])) as T;
}
