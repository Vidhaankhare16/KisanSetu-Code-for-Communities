import type { CropCategory, StageKey } from "@/contracts/simulation";

export type Season = "kharif" | "rabi" | "zaid";

/** A sowing window expressed as calendar month/day (inclusive), valid in any year. */
export interface SowingWindow {
  season: Season;
  from: { month: number; day: number };
  to: { month: number; day: number };
}

/** Weather patterns that raise pest or disease pressure (evaluated in `domain/agro/risks.ts`). */
export type RiskRule =
  | "cool_humid" // foliar fungi that love mild, wet weather (rusts, late blight, Alternaria)
  | "warm_humid" // blast, leaf spots, soybean rust, early blight
  | "cool_dry" // aphids on mustard/wheat in clear, cool spells
  | "warm_flowering" // pod/boll borers active around flowering in warm weather
  | "hot_dry"; // whitefly, thrips, mites and the viruses they carry

export interface PestRisk {
  name: string;
  kind: "pest" | "disease";
  rule: RiskRule;
  stages: StageKey[];
  action: string;
}

export interface CardinalTemperatures {
  /** Below this no thermal development accrues (°C). */
  base: number;
  /** Optimal band for growth (°C, daily mean). */
  optLow: number;
  optHigh: number;
  /** Development stops above this daily mean (°C). */
  max: number;
}

/**
 * Crop model parameters. Water parameters follow FAO Irrigation & Drainage Paper 56
 * (Kc, stage lengths, rooting depth, depletion fraction p) and Paper 33 (yield response
 * factor Ky). Economics use the latest notified MSP where one exists.
 */
export interface CropModel {
  id: string;
  name: string;
  localName: string;
  category: CropCategory;
  sowingWindows: SowingWindow[];
  /** Nominal duration from sowing to harvest at optimal temperatures (days). */
  durationDays: number;
  /** Fraction of the season spent in the initial, development, mid and late stages. */
  stageFractions: [number, number, number, number];
  stageLabels: [string, string, string, string];
  stageNotes: [string, string, string, string];
  temperature: CardinalTemperatures;
  /** Daily max temperature above which flowering / grain fill is damaged (°C). */
  heatStressC: number;
  /** Daily min temperature below which frost / chilling injury occurs (°C). */
  coldStressC: number;
  kc: { ini: number; mid: number; end: number };
  rootDepthM: number;
  /** FAO-56 soil water depletion fraction before stress (p). */
  depletionFraction: number;
  /** FAO-33 seasonal yield response factor. */
  ky: number;
  maxHeightCm: number;
  harvestIndex: number;
  /** Attainable yield with good management and no water/heat stress (kg/ha of economic product). */
  potentialYieldKgHa: number;
  price: { perQuintalInr: number; basis: string };
  /**
   * Year-to-year coefficient of variation of the price the farmer actually realises.
   * Low where MSP procurement is effective (wheat, rice), high for vegetables.
   */
  priceVolatility: number;
  /** Indicative cost of cultivation (paid-out + family labour, A2+FL) per acre. */
  costPerAcreInr: number;
  /** Value of straw/stover/bhusa per acre, earned in addition to the grain. */
  byproductPerAcreInr: number;
  phRange: [number, number];
  /** Soil EC (dS/m, 1:2) above which yield starts to fall. */
  salinityToleranceEc: number;
  nitrogenFixing: boolean;
  waterIntensity: "low" | "medium" | "high";
  /** Residue is commonly burnt in parts of India (straw management needed). */
  residueBurningRisk: boolean;
  risks: PestRisk[];
}
