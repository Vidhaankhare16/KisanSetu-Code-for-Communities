/**
 * Crop model types, inferred from the published schema in `contracts/cropModel.ts` so the
 * code and the format other states exchange can never diverge.
 *
 * Parameter meanings:
 * - kc, stageFractions, rootDepthM, depletionFraction (p): FAO Irrigation & Drainage Paper 56.
 * - ky (yield response to water deficit): FAO Paper 33.
 * - temperature: cardinal temperatures for thermal time and growth (°C, daily mean).
 * - heatStressC / coldStressC: daily max / min thresholds that damage sensitive stages.
 * - priceVolatility: coefficient of variation of the price the farmer realises.
 * - costPerAcreInr: indicative A2+FL cost of cultivation.
 */
import type { z } from "zod";
import type { CropModelSchema, PestRiskSchema, RiskRuleSchema, SeasonSchema, SowingWindowSchema } from "@/contracts/cropModel";

export type CropModel = z.infer<typeof CropModelSchema>;
export type PestRisk = z.infer<typeof PestRiskSchema>;
export type RiskRule = z.infer<typeof RiskRuleSchema>;
export type Season = z.infer<typeof SeasonSchema>;
export type SowingWindow = z.infer<typeof SowingWindowSchema>;
export type CardinalTemperatures = CropModel["temperature"];
