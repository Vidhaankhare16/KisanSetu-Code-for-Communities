/**
 * Tools the Kisan Mitra agent may call. Each tool has a Zod-validated argument schema (also
 * sent to Gemini as its JSON schema) and returns a compact, number-rich summary.
 */
import "server-only";
import { z } from "zod";
import { EligibilityProfileSchema, RecommendRequestSchema, SimulateRequestSchema } from "@/contracts/api";
import { FarmerPrioritySchema, WaterAccessSchema, type Lang, type Place } from "@/contracts/farm";
import { evaluateSchemes } from "@/domain/schemes/catalog";
import { CROP_IDS, CROPS, getCrop } from "@/domain/crops/catalog";
import { searchPlaces } from "@/server/providers/geocoding";
import { getFieldContext } from "@/server/services/fieldContext";
import { recommendCrops } from "@/server/services/recommendation";
import { simulateCrop } from "@/server/services/simulation";

export interface ToolContext {
  place?: Place;
  today: string;
  lang: Lang;
}

interface ToolDefinition<A extends z.ZodType> {
  name: string;
  description: string;
  args: A;
  run: (args: z.infer<A>, ctx: ToolContext) => Promise<unknown>;
  summarise: (args: z.infer<A>) => string;
}

const define = <A extends z.ZodType>(t: ToolDefinition<A>) => t;

const LocationArgs = {
  lat: z.number().optional().describe("Latitude, only if the farmer named a different place (use find_place first)."),
  lon: z.number().optional(),
  place_name: z.string().optional(),
};

function resolvePlace(args: { lat?: number; lon?: number; place_name?: string }, ctx: ToolContext): Place {
  if (args.lat !== undefined && args.lon !== undefined) {
    return { name: args.place_name ?? "Farmer's field", lat: args.lat, lon: args.lon };
  }
  if (ctx.place) return ctx.place;
  throw new Error("LOCATION_UNKNOWN: ask the farmer for their village or district, then call find_place.");
}

export const TOOLS = [
  define({
    name: "find_place",
    description: "Find the coordinates of an Indian village, town or district the farmer mentions.",
    args: z.object({ query: z.string().describe("Place name, optionally with district/state") }),
    run: async ({ query }) => (await searchPlaces(query, 5)).map((p) => ({ ...p })),
    summarise: ({ query }) => `Looked up “${query}”`,
  }),
  define({
    name: "get_field_conditions",
    description: "Current weather, 16-day forecast summary, soil type and satellite vegetation index for the field.",
    args: z.object(LocationArgs),
    run: async (args, ctx) => {
      const c = await getFieldContext(resolvePlace(args, ctx), { today: ctx.today });
      const days = c.forecast?.days ?? [];
      return {
        place: c.place,
        now: c.forecast?.current,
        next16Days: days.map((d) => ({ date: d.date, tMax: d.tMax, tMin: d.tMin, rainMm: d.rain, rainChancePct: d.rainProbabilityPct })),
        soil: { texture: c.soil.texture, source: c.soil.source, ...c.soil.profile },
        satelliteNdvi: c.vegetation?.latest ?? null,
      };
    },
    summarise: () => "Checked weather, soil and satellite data",
  }),
  define({
    name: "recommend_crops",
    description: "Rank the crops that can be sown on a date for this field using the crop simulation model.",
    args: z.object({
      ...LocationArgs,
      sowing_date: z.string().optional().describe("YYYY-MM-DD; default today"),
      water_access: WaterAccessSchema.optional(),
      priority: FarmerPrioritySchema.optional(),
      previous_crop: z.string().optional(),
      include_vegetables: z.boolean().optional().describe("True only if the farmer can sell vegetables nearby"),
    }),
    run: async (args, ctx) => {
      const res = await recommendCrops(
        RecommendRequestSchema.parse({
          place: resolvePlace(args, ctx),
          sowingDate: args.sowing_date ?? ctx.today,
          water: args.water_access ?? "limited",
          priority: args.priority ?? "balanced",
          previousCrop: args.previous_crop,
          includeVegetables: args.include_vegetables ?? false,
          advise: false,
          lang: ctx.lang,
        }),
      );
      return res.ranking.slice(0, 5).map((r) => ({
        crop: r.crop.name,
        localName: r.crop.localName,
        verdict: r.outcome.verdict,
        yieldQuintalPerAcre: r.outcome.expectedYieldQuintalPerAcre,
        netProfitPerAcre: r.ensemble.netProfitPerAcreInr,
        irrigationMm: r.ensemble.irrigationMm.p50,
        harvestDate: r.harvestDate,
        regenerativeScore: r.outcome.regenerativeScore,
      }));
    },
    summarise: (a) => `Ranked crops for sowing on ${a.sowing_date ?? "today"}`,
  }),
  define({
    name: "simulate_crop",
    description: "Simulate one crop's season on this field until harvest: yield, profit, water, risks and key dates.",
    args: z.object({
      ...LocationArgs,
      crop_id: z.enum(CROP_IDS as [string, ...string[]]),
      sowing_date: z.string().optional(),
      water_access: WaterAccessSchema.optional(),
    }),
    run: async (args, ctx) => {
      const { simulation: s, analysis } = await simulateCrop(
        SimulateRequestSchema.parse({
          place: resolvePlace(args, ctx),
          sowingDate: args.sowing_date ?? ctx.today,
          cropId: args.crop_id,
          water: args.water_access ?? "limited",
          narrate: false,
        }),
      );
      return {
        crop: s.crop.name,
        harvestDate: s.harvestDate,
        outcome: s.outcome,
        profitRange: s.ensemble?.netProfitPerAcreInr,
        irrigations: analysis.waterBalance.irrigationCount,
        keyEvents: s.events.filter((e) => e.type !== "stage_change").slice(0, 8).map((e) => `${e.date}: ${e.title}${e.action ? ` — ${e.action}` : ""}`),
      };
    },
    summarise: (a) => `Simulated ${getCrop(a.crop_id)?.name ?? a.crop_id} until harvest`,
  }),
  define({
    name: "check_schemes",
    description: "Check which central government schemes the farmer is eligible for.",
    args: z.object({
      land_acres: z.number(),
      owns_land: z.boolean().optional(),
      is_tenant: z.boolean().optional(),
      has_kcc: z.boolean().optional(),
      is_fpo_member: z.boolean().optional(),
      age: z.number().optional(),
    }),
    run: async (a) =>
      evaluateSchemes(
        EligibilityProfileSchema.parse({
          landAcres: a.land_acres,
          ownsLand: a.owns_land ?? true,
          isTenant: a.is_tenant ?? false,
          hasKcc: a.has_kcc ?? false,
          isFpoMember: a.is_fpo_member ?? false,
          age: a.age,
        }),
      ).map((m) => ({ scheme: m.scheme.name, eligible: m.result.eligible, reason: m.result.reason, benefit: m.scheme.benefit })),
    summarise: () => "Checked scheme eligibility",
  }),
  define({
    name: "get_msp",
    description: "Minimum Support Price (or indicative mandi price) for crops.",
    args: z.object({ crop_id: z.string().optional() }),
    run: async ({ crop_id }) =>
      CROPS.filter((c) => !crop_id || c.id === crop_id).map((c) => ({ crop: c.name, pricePerQuintal: c.price.perQuintalInr, basis: c.price.basis })),
    summarise: () => "Looked up MSP",
  }),
] as const;

export type AnyTool = (typeof TOOLS)[number];

export function findTool(name: string): AnyTool | undefined {
  return TOOLS.find((t) => t.name === name);
}
