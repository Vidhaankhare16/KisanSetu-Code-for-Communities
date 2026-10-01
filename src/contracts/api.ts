/**
 * Public API v1 contract. These schemas validate requests, type responses and generate the
 * OpenAPI document served at /api/v1/openapi.json — so the docs can never drift from code.
 */
import { z } from "zod";
import { AdvisoryBriefSchema, DiagnosisSchema, SoilCardExtractionSchema } from "./ai";
import { FarmerPrioritySchema, FarmProfileSchema, LangSchema, PlaceSchema, SoilTextureSchema } from "./farm";
import { EnsembleSummarySchema, SimCropSchema, SimOutcomeSchema, SimulationResultSchema } from "./simulation";

export const ApiErrorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string(), details: z.unknown().optional() }),
});

// ---------------------------------------------------------------------------- places

export const PlaceSearchQuerySchema = z.object({ q: z.string().min(2).max(80) });
export const PlaceSearchResponseSchema = z.object({ places: z.array(PlaceSchema) });
export const ReverseGeocodeQuerySchema = z.object({ lat: z.coerce.number(), lon: z.coerce.number() });

// ----------------------------------------------------------------------- field context

export const FieldContextQuerySchema = z.object({
  lat: z.coerce.number().min(6).max(38),
  lon: z.coerce.number().min(68).max(98),
  name: z.string().max(120).default("My field"),
  district: z.string().max(120).optional(),
  state: z.string().max(120).optional(),
});

const ForecastDaySchema = z.object({
  date: z.string(),
  tMax: z.number(),
  tMin: z.number(),
  rain: z.number(),
  et0: z.number(),
  rhMean: z.number().optional(),
  rainProbabilityPct: z.number().nullable(),
});

export const FieldContextResponseSchema = z.object({
  place: PlaceSchema,
  today: z.string(),
  forecast: z
    .object({
      days: z.array(ForecastDaySchema),
      current: z
        .object({
          temperatureC: z.number().nullable(),
          humidityPct: z.number().nullable(),
          precipitationMm: z.number().nullable(),
          windKmh: z.number().nullable(),
          weatherCode: z.number().nullable(),
        })
        .nullable(),
      rootZoneSoilMoisture: z.number().nullable(),
    })
    .nullable(),
  soil: z.object({
    texture: SoilTextureSchema,
    source: z.enum(["farmer", "soilgrids", "regional_default"]),
    note: z.string().optional(),
    profile: z
      .object({
        sandPct: z.number(),
        clayPct: z.number(),
        siltPct: z.number(),
        pH: z.number(),
        organicCarbonPct: z.number(),
        totalNitrogenGkg: z.number(),
      })
      .nullable(),
  }),
  vegetation: z
    .object({
      series: z.array(z.object({ date: z.string(), ndvi: z.number() })),
      latest: z.object({ date: z.string(), ndvi: z.number() }).nullable(),
      yearAgo: z.object({ date: z.string(), ndvi: z.number() }).nullable(),
      cover: z.enum(["bare", "sparse", "moderate", "dense"]),
    })
    .nullable(),
  warnings: z.array(z.string()),
});
export type FieldContextResponse = z.infer<typeof FieldContextResponseSchema>;

// -------------------------------------------------------------------------- simulate

export const SimulateRequestSchema = FarmProfileSchema.extend({
  cropId: z.string().min(1),
  lang: LangSchema.default("en"),
  /** Ask Gemini for a plain-language narrative (and translation when lang ≠ en). */
  narrate: z.boolean().default(true),
});
export type SimulateRequest = z.infer<typeof SimulateRequestSchema>;
export type SimulateInput = z.input<typeof SimulateRequestSchema>;

const RegenerativeSchema = z.object({
  score: z.number(),
  factors: z.array(z.object({ key: z.string(), label: z.string(), points: z.number(), max: z.number(), note: z.string() })),
});

export const SimulationAnalysisSchema = z.object({
  yieldFactors: z.object({
    water: z.number(),
    temperature: z.number(),
    heat: z.number(),
    cold: z.number(),
    soil: z.number(),
    maturity: z.number(),
  }),
  economics: z.object({
    yieldQuintalPerAcre: z.number(),
    revenuePerAcreInr: z.number(),
    costPerAcreInr: z.number(),
    netProfitPerAcreInr: z.number(),
    irrigationCostPerAcreInr: z.number(),
    fertiliserCorrectionPerAcreInr: z.number(),
  }),
  regenerative: RegenerativeSchema,
  waterBalance: z.object({
    rainMm: z.number(),
    effectiveRainMm: z.number(),
    cropWaterNeedMm: z.number(),
    actualEtMm: z.number(),
    irrigationNetMm: z.number(),
    irrigationGrossMm: z.number(),
    irrigationCount: z.number(),
    drainageMm: z.number(),
  }),
  members: z.array(
    z.object({
      scenarioId: z.string(),
      year: z.number().optional(),
      yieldKgHa: z.number(),
      netProfitPerAcreInr: z.number(),
      irrigationGrossMm: z.number(),
      matured: z.boolean(),
      drySpellDays: z.number(),
      heatDegreeDays: z.number(),
      coldDegreeDays: z.number(),
    }),
  ),
});

export const SimulateResponseSchema = z.object({
  simulation: SimulationResultSchema,
  analysis: SimulationAnalysisSchema,
  soil: z.object({ texture: SoilTextureSchema, source: z.string() }),
  warnings: z.array(z.string()),
});
export type SimulateResponse = z.infer<typeof SimulateResponseSchema>;

// ------------------------------------------------------------------------- recommend

export const RecommendRequestSchema = FarmProfileSchema.extend({
  priority: FarmerPrioritySchema.default("balanced"),
  /** The farmer can sell perishable vegetables (nearby mandi or cold storage). */
  includeVegetables: z.boolean().default(false),
  lang: LangSchema.default("en"),
  /** Ask Gemini to explain the ranking and write a regenerative plan. */
  advise: z.boolean().default(true),
});
export type RecommendRequest = z.infer<typeof RecommendRequestSchema>;
export type RecommendInput = z.input<typeof RecommendRequestSchema>;

export const RankedCropSchema = z.object({
  rank: z.number().int(),
  score: z.number(),
  criteria: z.object({
    profit: z.number(),
    downside: z.number(),
    water: z.number(),
    soil: z.number(),
    stability: z.number(),
  }),
  crop: SimCropSchema,
  simulationId: z.string(),
  durationDays: z.number().int(),
  harvestDate: z.string(),
  outcome: SimOutcomeSchema,
  ensemble: EnsembleSummarySchema,
  regenerative: RegenerativeSchema,
});
export type RankedCropDto = z.infer<typeof RankedCropSchema>;

export const RecommendResponseSchema = z.object({
  id: z.string(),
  place: PlaceSchema,
  sowingDate: z.string(),
  priority: FarmerPrioritySchema,
  soil: z.object({ texture: SoilTextureSchema, source: z.string() }),
  ranking: z.array(RankedCropSchema),
  /** Full day-by-day simulations for the top three crops (others via /simulate). */
  topSimulations: z.array(SimulationResultSchema),
  advisory: AdvisoryBriefSchema.nullable(),
  warnings: z.array(z.string()),
});
export type RecommendResponse = z.infer<typeof RecommendResponseSchema>;

// -------------------------------------------------------------------------- diagnose

const MAX_IMAGE_BASE64 = 8_000_000; // ≈ 6 MB image
export const ImagePayloadSchema = z.object({
  imageBase64: z.string().min(100).max(MAX_IMAGE_BASE64),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/heic"]),
});

export const DiagnoseRequestSchema = ImagePayloadSchema.extend({
  note: z.string().max(500).optional(),
  cropHint: z.string().max(40).optional(),
  place: PlaceSchema.optional(),
  lang: LangSchema.default("en"),
});
export const DiagnoseResponseSchema = z.object({
  id: z.string(),
  diagnosis: DiagnosisSchema,
  weatherContext: z.string().nullable(),
});
export type DiagnoseResponse = z.infer<typeof DiagnoseResponseSchema>;

export const SoilCardRequestSchema = ImagePayloadSchema;
export const SoilCardResponseSchema = SoilCardExtractionSchema;

// ------------------------------------------------------------------------------ chat

export const ChatMessageSchema = z.object({
  role: z.enum(["user", "model"]),
  text: z.string().max(4000),
});

export const ChatRequestSchema = z
  .object({
    messages: z.array(ChatMessageSchema).max(20).default([]),
    audio: z.object({ base64: z.string().max(4_000_000), mimeType: z.enum(["audio/wav", "audio/mpeg", "audio/ogg", "audio/webm"]) }).optional(),
    place: PlaceSchema.optional(),
    lang: LangSchema.default("en"),
  })
  .refine((r) => r.audio || r.messages.some((m) => m.role === "user"), "Send a question as text or audio");
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type ChatInput = z.input<typeof ChatRequestSchema>;

export const ChatResponseSchema = z.object({
  reply: z.string(),
  transcript: z.string().nullable(),
  toolCalls: z.array(z.object({ name: z.string(), summary: z.string() })),
});
export type ChatResponse = z.infer<typeof ChatResponseSchema>;

export const SpeakRequestSchema = z.object({ text: z.string().min(1).max(1500), lang: LangSchema.default("hi") });

// ------------------------------------------------------------------------- schemes

export const EligibilityProfileSchema = z.object({
  landAcres: z.number().min(0).max(1000),
  ownsLand: z.boolean().default(true),
  isTenant: z.boolean().default(false),
  isFpoMember: z.boolean().default(false),
  inOilseedCluster: z.boolean().default(false),
  hasRiceFallow: z.boolean().default(false),
  hasKcc: z.boolean().default(false),
  isIncomeTaxPayer: z.boolean().default(false),
  age: z.number().int().min(14).max(110).optional(),
  category: z.enum(["general", "obc", "sc", "st"]).default("general"),
  gender: z.enum(["male", "female", "other"]).optional(),
  state: z.string().max(80).optional(),
});
export type EligibilityProfile = z.infer<typeof EligibilityProfileSchema>;
