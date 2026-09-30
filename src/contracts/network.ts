/** National outlook and network dashboard contracts. */
import { z } from "zod";

export const OutlookCropSchema = z.object({
  cropId: z.string(),
  score: z.number(),
  verdict: z.enum(["recommended", "caution", "not_recommended"]),
  yieldQuintalPerAcre: z.number(),
  profitP10: z.number(),
  profitP50: z.number(),
  irrigationMm: z.number(),
  probDrySpell: z.number(),
  probHeatStress: z.number(),
  regenerativeScore: z.number(),
});

export const OutlookDistrictSchema = z.object({
  district: z.string(),
  state: z.string(),
  lat: z.number(),
  lon: z.number(),
  water: z.enum(["rainfed", "limited", "assured"]),
  soil: z.object({ texture: z.string(), source: z.string() }),
  top: z.array(OutlookCropSchema).min(1),
});
export type OutlookDistrict = z.infer<typeof OutlookDistrictSchema>;

export const OutlookSchema = z.object({
  season: z.string(),
  sowingDate: z.string(),
  generatedAt: z.string(),
  method: z.string(),
  districts: z.array(OutlookDistrictSchema),
});
export type Outlook = z.infer<typeof OutlookSchema>;
