/**
 * Simulation contract — the season-long, day-by-day output of the crop model.
 *
 * This is the single source of truth for the shape consumed by the visual crop
 * simulator (`src/features/simulator`). Field names and meanings mirror
 * `SimulationResult` in the simulator's `types.ts` exactly; the API returns a
 * superset (it adds `ensemble`), which stays structurally assignable.
 */
import { z } from "zod";

export const StageKeySchema = z.enum(["initial", "development", "mid", "late"]);
export type StageKey = z.infer<typeof StageKeySchema>;

export const EventTypeSchema = z.enum([
  "sowing",
  "stage_change",
  "irrigation",
  "fertilizer",
  "dry_spell",
  "heavy_rain",
  "heat_stress",
  "cold_stress",
  "pest_risk",
  "disease_risk",
  "harvest",
]);
export type EventType = z.infer<typeof EventTypeSchema>;

export const SeveritySchema = z.enum(["info", "warning", "critical"]);
export type Severity = z.infer<typeof SeveritySchema>;

export const CropCategorySchema = z.enum(["cereal", "millet", "pulse", "oilseed", "vegetable", "cash", "fodder"]);
export type CropCategory = z.infer<typeof CropCategorySchema>;

export const SimCropSchema = z.object({
  id: z.string(),
  name: z.string(),
  localName: z.string(),
  category: CropCategorySchema,
});
export type SimCrop = z.infer<typeof SimCropSchema>;

export const SimLocationSchema = z.object({
  name: z.string(),
  district: z.string().optional(),
  state: z.string().optional(),
  lat: z.number(),
  lon: z.number(),
});
export type SimLocation = z.infer<typeof SimLocationSchema>;

export const SimStageSchema = z.object({
  key: StageKeySchema,
  label: z.string(),
  startDay: z.number().int(),
  endDay: z.number().int(),
  description: z.string(),
});
export type SimStage = z.infer<typeof SimStageSchema>;

export const SimDaySchema = z.object({
  day: z.number().int(),
  date: z.string(),
  stage: StageKeySchema,
  progress: z.number(),
  canopyCover: z.number(),
  plantHeightCm: z.number(),
  biomassKgHa: z.number(),
  tMaxC: z.number(),
  tMinC: z.number(),
  rainMm: z.number(),
  et0Mm: z.number(),
  etcMm: z.number(),
  soilMoisturePct: z.number(),
  irrigationMm: z.number(),
  waterStress: z.number(),
  heatStress: z.number(),
  health: z.number(),
  weatherSource: z.enum(["forecast", "climatology"]),
});
export type SimDay = z.infer<typeof SimDaySchema>;

export const SimEventSchema = z.object({
  day: z.number().int(),
  date: z.string(),
  type: EventTypeSchema,
  severity: SeveritySchema,
  title: z.string(),
  detail: z.string(),
  action: z.string().optional(),
});
export type SimEvent = z.infer<typeof SimEventSchema>;

export const VerdictSchema = z.enum(["recommended", "caution", "not_recommended"]);
export type Verdict = z.infer<typeof VerdictSchema>;

export const SimOutcomeSchema = z.object({
  expectedYieldKgHa: z.number(),
  potentialYieldKgHa: z.number(),
  expectedYieldQuintalPerAcre: z.number(),
  totalRainMm: z.number(),
  totalIrrigationMm: z.number(),
  totalCropWaterNeedMm: z.number(),
  costPerAcreInr: z.number(),
  revenuePerAcreInr: z.number(),
  netProfitPerAcreInr: z.number(),
  pricePerQuintalInr: z.number(),
  priceBasis: z.string(),
  riskScore: z.number(),
  regenerativeScore: z.number(),
  verdict: VerdictSchema,
});
export type SimOutcome = z.infer<typeof SimOutcomeSchema>;

export const SimNarrativeSchema = z.object({
  headline: z.string(),
  bullets: z.array(z.string()).min(1).max(5),
});
export type SimNarrative = z.infer<typeof SimNarrativeSchema>;

export const SimDataSourceSchema = z.object({
  name: z.string(),
  kind: z.enum(["forecast", "climatology", "satellite", "soil", "model", "price"]),
});
export type SimDataSource = z.infer<typeof SimDataSourceSchema>;

/** Spread of outcomes across the historical-weather ensemble (P10 = bad year). */
export const PercentilesSchema = z.object({
  p10: z.number(),
  p50: z.number(),
  p90: z.number(),
});
export type Percentiles = z.infer<typeof PercentilesSchema>;

export const EnsembleSummarySchema = z.object({
  members: z.number().int(),
  years: z.array(z.number().int()),
  yieldKgHa: PercentilesSchema,
  netProfitPerAcreInr: PercentilesSchema,
  irrigationMm: PercentilesSchema,
  probDrySpell: z.number(),
  probHeatStress: z.number(),
  probColdStress: z.number(),
  probLoss: z.number(),
});
export type EnsembleSummary = z.infer<typeof EnsembleSummarySchema>;

export const SimulationResultSchema = z.object({
  id: z.string(),
  crop: SimCropSchema,
  location: SimLocationSchema,
  sowingDate: z.string(),
  harvestDate: z.string(),
  durationDays: z.number().int(),
  stages: z.array(SimStageSchema),
  days: z.array(SimDaySchema),
  events: z.array(SimEventSchema),
  outcome: SimOutcomeSchema,
  narrative: SimNarrativeSchema.optional(),
  dataSources: z.array(SimDataSourceSchema),
  /** API extension (not in the simulator contract): ensemble statistics. */
  ensemble: EnsembleSummarySchema.optional(),
});
export type SimulationResult = z.infer<typeof SimulationResultSchema>;
