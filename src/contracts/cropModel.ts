/**
 * Crop model parameter schema — the interoperable format in which the national model and
 * state calibrations are published (GET /api/v1/models) and exchanged between states.
 */
import { z } from "zod";
import { CropCategorySchema, StageKeySchema } from "./simulation";

const MonthDaySchema = z.object({ month: z.number().int().min(1).max(12), day: z.number().int().min(1).max(31) });
const Quad = <T extends z.ZodType>(t: T) => z.tuple([t, t, t, t]);

export const SeasonSchema = z.enum(["kharif", "rabi", "zaid"]);

export const SowingWindowSchema = z.object({ season: SeasonSchema, from: MonthDaySchema, to: MonthDaySchema });

export const RiskRuleSchema = z.enum(["cool_humid", "warm_humid", "cool_dry", "warm_flowering", "hot_dry"]);

export const PestRiskSchema = z.object({
  name: z.string(),
  kind: z.enum(["pest", "disease"]),
  rule: RiskRuleSchema,
  stages: z.array(StageKeySchema).min(1),
  action: z.string(),
});

export const CropModelSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9_-]+$/),
    name: z.string(),
    localName: z.string(),
    category: CropCategorySchema,
    sowingWindows: z.array(SowingWindowSchema).min(1),
    durationDays: z.number().int().min(40).max(400),
    stageFractions: Quad(z.number().positive()),
    stageLabels: Quad(z.string()),
    stageNotes: Quad(z.string()),
    temperature: z.object({ base: z.number(), optLow: z.number(), optHigh: z.number(), max: z.number() }),
    heatStressC: z.number(),
    coldStressC: z.number(),
    kc: z.object({ ini: z.number().min(0.1).max(1.4), mid: z.number().min(0.3).max(1.4), end: z.number().min(0.1).max(1.4) }),
    rootDepthM: z.number().min(0.2).max(3),
    depletionFraction: z.number().min(0.1).max(0.8),
    ky: z.number().min(0.2).max(1.6),
    maxHeightCm: z.number().positive(),
    harvestIndex: z.number().min(0.05).max(0.95),
    potentialYieldKgHa: z.number().positive(),
    price: z.object({ perQuintalInr: z.number().positive(), basis: z.string() }),
    priceVolatility: z.number().min(0).max(1),
    costPerAcreInr: z.number().positive(),
    byproductPerAcreInr: z.number().min(0),
    phRange: z.tuple([z.number(), z.number()]),
    salinityToleranceEc: z.number().positive(),
    nitrogenFixing: z.boolean(),
    waterIntensity: z.enum(["low", "medium", "high"]),
    residueBurningRisk: z.boolean(),
    risks: z.array(PestRiskSchema),
  })
  .refine((c) => Math.abs(c.stageFractions.reduce((a, b) => a + b, 0) - 1) < 0.01, "stageFractions must sum to 1")
  .refine(
    (c) => c.temperature.base < c.temperature.optLow && c.temperature.optLow <= c.temperature.optHigh && c.temperature.optHigh < c.temperature.max,
    "cardinal temperatures must satisfy base < optLow ≤ optHigh < max",
  )
  .refine((c) => c.phRange[0] < c.phRange[1], "phRange must be [min, max]");

/** A published model: parameters plus provenance, so states can audit and calibrate. */
export const ModelCardSchema = z.object({
  id: z.string(),
  version: z.string(),
  scope: z.string().describe("'national' or a state/agro-climatic-zone code for calibrated variants"),
  parameters: CropModelSchema,
  sources: z.array(z.string()),
  updatedAt: z.string(),
});
export type ModelCard = z.infer<typeof ModelCardSchema>;
