/**
 * Crop recommendation service: simulate every sowable crop for the field, rank by the
 * farmer's priority, then have Gemini explain the result and write a regenerative plan.
 */
import "server-only";
import type { RankedCropDto, RecommendRequest, RecommendResponse } from "@/contracts/api";
import type { SimulationResult } from "@/contracts/simulation";
import { candidateCrops, rankCrops, type RankedCrop } from "@/domain/agro/recommend";
import { stableHash } from "@/domain/hash";
import { adviseOnRanking } from "@/server/ai/advisor";
import { narrateSimulation } from "@/server/ai/narrator";
import { TtlCache } from "@/server/cache";
import { isAiConfigured } from "@/server/config/env";
import { AppError } from "@/server/http/errors";
import { logger } from "@/server/logger";
import { recordInBackground } from "@/server/repositories";
import { anonymiseCoord } from "@/server/repositories/types";
import { prepareRun } from "./simulation";

const TOP_N = 3;
const cache = new TtlCache<RecommendResponse>(6 * 60 * 60 * 1000, 200);

export async function recommendCrops(req: RecommendRequest): Promise<RecommendResponse> {
  const id = `rec_${stableHash(req)}`;
  return cache.getOrLoad(id, async () => {
    const { context, base } = await prepareRun(req);
    const ranking = rankCrops(base, req.priority, candidateCrops(req.sowingDate, { includeVegetables: req.includeVegetables }));
    if (ranking.length === 0) {
      throw new AppError("bad_request", "No crop in the catalogue is normally sown around this date. Try another date.");
    }

    const warnings = [...context.warnings];
    const useAi = req.advise && isAiConfigured();
    const top = ranking.slice(0, TOP_N);

    const [advisory, topSimulations] = await Promise.all([
      useAi
        ? adviseOnRanking({ profile: req, context, ranking, lang: req.lang }).catch((err) => {
            logger.warn("advisor failed", { error: String(err) });
            warnings.push("The AI advisory is unavailable right now; rankings come straight from the crop model.");
            return null;
          })
        : Promise.resolve(null),
      Promise.all(top.map((r) => narrateOrPlain(r, req, useAi))),
    ]);

    const response: RecommendResponse = {
      id,
      place: req.place,
      sowingDate: req.sowingDate,
      priority: req.priority,
      soil: { texture: base.field.texture, source: context.soil.source },
      ranking: ranking.map(toDto),
      topSimulations,
      advisory,
      warnings,
    };

    recordInBackground(async (repo) => {
      await repo.saveRecommendation(response);
      await repo.saveAdvisory({
        id,
        kind: "recommendation",
        createdAt: new Date().toISOString(),
        state: req.place.state,
        district: req.place.district,
        lat: anonymiseCoord(req.place.lat),
        lon: anonymiseCoord(req.place.lon),
        sowingDate: req.sowingDate,
        water: req.water,
        cropIds: top.map((r) => r.result.simulation.crop.id),
        lang: req.lang,
      });
    });
    return response;
  });
}

async function narrateOrPlain(r: RankedCrop, req: RecommendRequest, useAi: boolean): Promise<SimulationResult> {
  if (!useAi) return r.result.simulation;
  try {
    return await narrateSimulation(r.result.simulation, r.result.analysis, req.lang);
  } catch (err) {
    logger.warn("narration failed", { crop: r.result.simulation.crop.id, error: String(err) });
    return r.result.simulation;
  }
}

function toDto(r: RankedCrop): RankedCropDto {
  const s = r.result.simulation;
  return {
    rank: r.rank,
    score: r.score,
    criteria: r.criteria,
    crop: s.crop,
    simulationId: s.id,
    durationDays: s.durationDays,
    harvestDate: s.harvestDate,
    outcome: s.outcome,
    ensemble: s.ensemble!,
    regenerative: r.result.analysis.regenerative,
  };
}
