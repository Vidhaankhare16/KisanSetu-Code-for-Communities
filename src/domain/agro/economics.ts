/** Per-acre farm economics for a simulated season. */
import type { SoilCard } from "@/contracts/farm";
import type { CropModel } from "@/domain/crops/types";

export const HECTARE_PER_ACRE = 0.404686;
/** Pumping cost of irrigation water (₹ per m³), a blend of electric and diesel pumps. */
const PUMPING_COST_PER_M3 = 4;
const M3_PER_MM_PER_ACRE = 4.04686;

/** Soil Health Card thresholds for "low" availability (kg/ha, ppm for S). */
const LOW = { nitrogen: 280, phosphorus: 10, sulphur: 10 } as const;
/** Extra fertiliser spend per acre to correct a low rating. */
const CORRECTION_COST = { nitrogen: 1200, phosphorus: 1000, sulphur: 600 } as const;

export interface Economics {
  yieldQuintalPerAcre: number;
  revenuePerAcreInr: number;
  costPerAcreInr: number;
  netProfitPerAcreInr: number;
  irrigationCostPerAcreInr: number;
  fertiliserCorrectionPerAcreInr: number;
}

export function kgPerHaToQuintalPerAcre(kgHa: number): number {
  return (kgHa / 100) * HECTARE_PER_ACRE;
}

/** Extra fertiliser needed because the soil card rates a nutrient as low. */
export function fertiliserCorrection(crop: CropModel, card: SoilCard | undefined): number {
  if (!card) return 0;
  let extra = 0;
  if (!crop.nitrogenFixing && card.nitrogen < LOW.nitrogen) extra += CORRECTION_COST.nitrogen;
  if (card.phosphorus < LOW.phosphorus) extra += CORRECTION_COST.phosphorus;
  if (crop.category === "oilseed" && card.sulphur !== undefined && card.sulphur < LOW.sulphur) {
    extra += CORRECTION_COST.sulphur;
  }
  return extra;
}

/**
 * Price scenarios (as multipliers of the reference price) approximating the 10th, 50th and
 * 90th percentiles of a normal price distribution with the crop's volatility.
 */
export function priceMultipliers(crop: CropModel): [number, number, number] {
  const spread = 1.2816 * crop.priceVolatility;
  return [Math.max(0.1, 1 - spread), 1, 1 + spread];
}

export function computeEconomics(
  crop: CropModel,
  yieldKgHa: number,
  irrigationGrossMm: number,
  soilCard?: SoilCard,
  priceMultiplier = 1,
): Economics {
  const yieldQuintalPerAcre = kgPerHaToQuintalPerAcre(yieldKgHa);
  const byproduct = crop.byproductPerAcreInr * Math.min(1, yieldKgHa / crop.potentialYieldKgHa);
  const revenue = yieldQuintalPerAcre * crop.price.perQuintalInr * priceMultiplier + byproduct;
  const irrigationCost = irrigationGrossMm * M3_PER_MM_PER_ACRE * PUMPING_COST_PER_M3;
  const correction = fertiliserCorrection(crop, soilCard);
  const cost = crop.costPerAcreInr + irrigationCost + correction;
  return {
    yieldQuintalPerAcre: Math.round(yieldQuintalPerAcre * 10) / 10,
    revenuePerAcreInr: Math.round(revenue),
    costPerAcreInr: Math.round(cost),
    netProfitPerAcreInr: Math.round(revenue - cost),
    irrigationCostPerAcreInr: Math.round(irrigationCost),
    fertiliserCorrectionPerAcreInr: correction,
  };
}
