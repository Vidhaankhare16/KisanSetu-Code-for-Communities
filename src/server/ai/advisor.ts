/**
 * Advisory agent: turns the ranked, simulated crop options into a farmer-facing brief and a
 * regenerative practice plan. The numbers come from the crop model; Gemini explains them.
 */
import "server-only";
import { AdvisoryBriefSchema, type AdvisoryBrief } from "@/contracts/ai";
import type { FarmProfile, Lang } from "@/contracts/farm";
import type { RankedCrop } from "@/domain/agro/recommend";
import { requireCrop } from "@/domain/crops/catalog";
import type { FieldContext } from "@/server/services/fieldContext";
import { generateStructured } from "./gemini";
import { GROUNDING_RULES, languageInstruction, PERSONA } from "./prompts";

export interface AdvisorInput {
  profile: FarmProfile;
  context: FieldContext;
  ranking: readonly RankedCrop[];
  lang: Lang;
}

export async function adviseOnRanking({ profile, context, ranking, lang }: AdvisorInput): Promise<AdvisoryBrief> {
  const top = ranking.slice(0, 5).map((r) => {
    const { simulation: s, analysis: a } = r.result;
    const crop = requireCrop(s.crop.id);
    return {
      rank: r.rank,
      cropId: s.crop.id,
      crop: `${s.crop.name} (${s.crop.localName})`,
      verdict: s.outcome.verdict,
      score: r.score,
      durationDays: s.durationDays,
      harvestDate: s.harvestDate,
      yieldQuintalPerAcreMedian: s.outcome.expectedYieldQuintalPerAcre,
      netProfitPerAcreInr: s.ensemble?.netProfitPerAcreInr,
      probabilityOfLoss: s.ensemble?.probLoss,
      irrigationMmMedian: s.ensemble?.irrigationMm.p50,
      priceBasis: `${s.outcome.pricePerQuintalInr} ₹/q (${s.outcome.priceBasis})`,
      riskScore: s.outcome.riskScore,
      regenerativeScore: s.outcome.regenerativeScore,
      regenerativeFactors: a.regenerative.factors.map((f) => `${f.label}: ${f.points}/${f.max} — ${f.note}`),
      yieldLimitedBy: Object.entries(a.yieldFactors)
        .filter(([, v]) => v < 0.95)
        .map(([k, v]) => `${k} (${Math.round(v * 100)}%)`),
      keyEvents: s.events
        .filter((e) => e.severity !== "info")
        .slice(0, 4)
        .map((e) => `${e.date}: ${e.title}`),
      nitrogenFixing: crop.nitrogenFixing,
      residueBurningRisk: crop.residueBurningRisk,
    };
  });

  const fc = context.forecast;
  const data = {
    place: profile.place,
    sowingDate: profile.sowingDate,
    landAcres: profile.landAcres,
    waterAccess: profile.water,
    irrigationMethod: profile.irrigationMethod,
    previousCrop: profile.previousCrop ?? "unknown",
    soil: {
      texture: context.soil.texture,
      source: context.soil.source,
      soilHealthCard: profile.soilCard ?? null,
      soilGrids: context.soil.profile ?? null,
    },
    satellite: context.vegetation?.latest
      ? { ndviNow: context.vegetation.latest, ndviYearAgo: context.vegetation.yearAgo, cover: context.vegetation.cover }
      : null,
    next16Days: fc
      ? {
          rainTotalMm: Math.round(fc.days.reduce((a, d) => a + d.rain, 0)),
          maxTempC: Math.max(...fc.days.map((d) => d.tMax)),
          minTempC: Math.min(...fc.days.map((d) => d.tMin)),
        }
      : null,
    rankedCrops: top,
  };

  return generateStructured({
    task: "advisor.ranking",
    schema: AdvisoryBriefSchema,
    system: `${PERSONA}

Your job: explain a crop recommendation produced by a validated crop simulation model and write a
regenerative plan for this field.
${GROUNDING_RULES}
- "crops" covers the top 3 ranked crops in rank order; use their cropId exactly.
- The regenerative plan must suit the top crop, the soil and the water access (e.g. mulching, residue
  retention instead of burning, green manure such as dhaincha/sunhemp, legume intercrops, reduced tillage,
  FYM/vermicompost, bio-fertilisers, drip). Give quantities and timing.
- soilActions: base on the Soil Health Card if present, else on SoilGrids values, else say to get a card.
${languageInstruction(lang)}`,
    input: `DATA:\n${JSON.stringify(data)}`,
    thinking: "low",
  });
}
