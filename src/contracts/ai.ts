/** Shapes produced by the Gemini agents. Every AI response is validated against these. */
import { z } from "zod";

export const AdvisoryBriefSchema = z.object({
  headline: z.string().describe("One sentence, farmer-friendly verdict naming the best crop."),
  summary: z.string().describe("2-3 sentences explaining the recommendation using only the numbers provided."),
  crops: z
    .array(
      z.object({
        cropId: z.string(),
        why: z.string().describe("Why this crop suits this field, citing the provided numbers."),
        watchOut: z.array(z.string()).max(3).describe("Main risks for this crop on this field."),
      }),
    )
    .max(3),
  regenerativePlan: z
    .array(
      z.object({
        practice: z.string().describe("Short name, e.g. 'Mulch with paddy straw'."),
        why: z.string(),
        how: z.string().describe("Concrete steps with quantities and timing."),
        timing: z.string(),
      }),
    )
    .min(2)
    .max(5),
  soilActions: z.array(z.string()).max(4).describe("Fertiliser and soil-health actions based on the soil data."),
  rotationTip: z.string().describe("What to grow in the next season to keep the rotation healthy."),
});
export type AdvisoryBrief = z.infer<typeof AdvisoryBriefSchema>;

export const LocalizedSimulationSchema = z.object({
  headline: z.string(),
  bullets: z.array(z.string()).min(2).max(5),
  stages: z.array(z.object({ label: z.string(), description: z.string() })),
  events: z.array(z.object({ title: z.string(), detail: z.string(), action: z.string().optional() })),
});
export type LocalizedSimulation = z.infer<typeof LocalizedSimulationSchema>;

export const DiagnosisSchema = z.object({
  crop: z.string().describe("Crop identified in the photo (English common name)."),
  healthy: z.boolean(),
  issue: z.string().describe("Disease, pest, deficiency or disorder name; 'None' when healthy."),
  issueType: z.enum(["disease", "pest", "nutrient_deficiency", "abiotic_stress", "healthy", "unclear"]),
  confidence: z.number().min(0).max(1),
  severity: z.enum(["none", "low", "medium", "high"]),
  symptomsSeen: z.array(z.string()).max(5),
  whyThisDiagnosis: z.string().describe("How the visible symptoms and recent weather support the diagnosis."),
  organicTreatment: z.array(z.string()).max(4),
  chemicalTreatment: z
    .array(z.string())
    .max(3)
    .describe("Registered active ingredient with dose per litre; include safety interval."),
  prevention: z.array(z.string()).max(4),
  escalate: z.boolean().describe("True when an extension officer / KVK should inspect the field."),
  escalateReason: z.string().optional(),
});
export type Diagnosis = z.infer<typeof DiagnosisSchema>;

export const SoilCardExtractionSchema = z.object({
  isSoilHealthCard: z.boolean(),
  values: z.object({
    pH: z.number().nullable(),
    electricalConductivity: z.number().nullable(),
    organicCarbon: z.number().nullable(),
    nitrogen: z.number().nullable(),
    phosphorus: z.number().nullable(),
    potassium: z.number().nullable(),
    sulphur: z.number().nullable(),
    zinc: z.number().nullable(),
    boron: z.number().nullable(),
  }),
  farmerName: z.string().nullable(),
  sampleDate: z.string().nullable(),
  notes: z.string().describe("Anything unclear or converted (e.g. units)."),
});
export type SoilCardExtraction = z.infer<typeof SoilCardExtractionSchema>;
