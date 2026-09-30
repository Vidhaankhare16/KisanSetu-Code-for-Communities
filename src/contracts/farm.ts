/** Farm, soil and language inputs shared by the API, the services and the UI. */
import { z } from "zod";

export const LANGS = ["en", "hi", "bn", "te", "mr", "ta", "gu", "kn", "ml", "pa", "or"] as const;
export const LangSchema = z.enum(LANGS);
export type Lang = z.infer<typeof LangSchema>;

export const LANG_NAMES: Record<Lang, { english: string; native: string }> = {
  en: { english: "English", native: "English" },
  hi: { english: "Hindi", native: "हिन्दी" },
  bn: { english: "Bengali", native: "বাংলা" },
  te: { english: "Telugu", native: "తెలుగు" },
  mr: { english: "Marathi", native: "मराठी" },
  ta: { english: "Tamil", native: "தமிழ்" },
  gu: { english: "Gujarati", native: "ગુજરાતી" },
  kn: { english: "Kannada", native: "ಕನ್ನಡ" },
  ml: { english: "Malayalam", native: "മലയാളം" },
  pa: { english: "Punjabi", native: "ਪੰਜਾਬੀ" },
  or: { english: "Odia", native: "ଓଡ଼ିଆ" },
};

export const CoordinatesSchema = z.object({
  lat: z.number().min(6).max(38, "Latitude must be inside India"),
  lon: z.number().min(68).max(98, "Longitude must be inside India"),
});

export const PlaceSchema = CoordinatesSchema.extend({
  name: z.string().min(1).max(120),
  district: z.string().max(120).optional(),
  state: z.string().max(120).optional(),
});
export type Place = z.infer<typeof PlaceSchema>;

/** How reliably the farm can be irrigated through the season. */
export const WaterAccessSchema = z.enum(["rainfed", "limited", "assured"]);
export type WaterAccess = z.infer<typeof WaterAccessSchema>;

export const IrrigationMethodSchema = z.enum(["flood", "sprinkler", "drip"]);
export type IrrigationMethod = z.infer<typeof IrrigationMethodSchema>;

/** USDA soil texture classes (derived from SoilGrids sand/clay or chosen by the farmer). */
export const SoilTextureSchema = z.enum([
  "sand",
  "loamy_sand",
  "sandy_loam",
  "loam",
  "silt_loam",
  "silt",
  "sandy_clay_loam",
  "clay_loam",
  "silty_clay_loam",
  "sandy_clay",
  "silty_clay",
  "clay",
]);
export type SoilTexture = z.infer<typeof SoilTextureSchema>;

/**
 * Soil Health Card values (Government of India SHC format). Units follow the card:
 * available N/P/K in kg/ha, organic carbon in %, EC in dS/m, micronutrients in ppm.
 */
export const SoilCardSchema = z.object({
  landType: z.enum(["upland", "midland", "lowland"]).optional(),
  pH: z.number().min(3).max(11),
  electricalConductivity: z.number().min(0).max(20),
  organicCarbon: z.number().min(0).max(5),
  nitrogen: z.number().min(0).max(2000),
  phosphorus: z.number().min(0).max(500),
  potassium: z.number().min(0).max(2000),
  sulphur: z.number().min(0).max(200).optional(),
  zinc: z.number().min(0).max(50).optional(),
  boron: z.number().min(0).max(20).optional(),
});
export type SoilCard = z.infer<typeof SoilCardSchema>;

export const FarmerPrioritySchema = z.enum(["balanced", "profit", "low_risk", "save_water", "soil_health"]);
export type FarmerPriority = z.infer<typeof FarmerPrioritySchema>;

export const IsoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use ISO date format YYYY-MM-DD");

/** Everything the crop model needs to know about one field. */
export const FarmProfileSchema = z.object({
  place: PlaceSchema,
  sowingDate: IsoDateSchema,
  landAcres: z.number().positive().max(1000).default(1),
  water: WaterAccessSchema.default("limited"),
  irrigationMethod: IrrigationMethodSchema.default("flood"),
  soilTexture: SoilTextureSchema.optional(),
  soilCard: SoilCardSchema.optional(),
  previousCrop: z.string().max(40).optional(),
});
export type FarmProfile = z.infer<typeof FarmProfileSchema>;
