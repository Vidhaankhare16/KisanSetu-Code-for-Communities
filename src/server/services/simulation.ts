/**
 * Orchestrates a season simulation: open-data context → weather ensemble → crop engine →
 * optional Gemini narration. Results are cached by their inputs.
 */
import "server-only";
import type { SimulateRequest, SimulateResponse } from "@/contracts/api";
import type { FarmProfile } from "@/contracts/farm";
import { runEnsemble, type EnsembleRequest } from "@/domain/agro/ensemble";
import { assembleScenarios, type HistoricalDay } from "@/domain/agro/scenarios";
import { hydraulicsFor } from "@/domain/agro/soil";
import { CROPS, getCrop } from "@/domain/crops/catalog";
import { stableHash } from "@/domain/hash";
import { addDays, daysBetween } from "@/domain/time";
import { narrateSimulation } from "@/server/ai/narrator";
import { TtlCache } from "@/server/cache";
import { env, isAiConfigured } from "@/server/config/env";
import { AppError } from "@/server/http/errors";
import { logger } from "@/server/logger";
import { getDailyHistory } from "@/server/providers/nasaPower";
import { anonymiseCoord } from "@/server/repositories/types";
import { recordInBackground } from "@/server/repositories";
import { getFieldContext, type FieldContext } from "./fieldContext";

/** Longest crop (cotton, 170 days) × thermal-time stretch, rounded up. */
const SEASON_DAYS = 240;
/** NASA POWER publishes with a short delay; stay a few days behind "today". */
const HISTORY_LAG_DAYS = 5;
const MAX_PAST_SOWING_DAYS = 60;
const MAX_FUTURE_SOWING_DAYS = 365;
/** Soil moisture assumed at sowing when neither observation nor history is available. */
const DEFAULT_INITIAL_MOISTURE = 0.5;

export interface PreparedRun {
  context: FieldContext;
  base: Omit<EnsembleRequest, "crop">;
}

/** Resolves a crop given by id or common/local name (used for "previous crop"). */
export function resolveCropId(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const v = value.trim().toLowerCase();
  return CROPS.find((c) => c.id === v || c.name.toLowerCase().startsWith(v) || c.localName.toLowerCase().includes(v))?.id;
}

export async function prepareRun(profile: FarmProfile): Promise<PreparedRun> {
  const context = await getFieldContext(profile.place, { texture: profile.soilTexture });
  const offset = daysBetween(context.today, profile.sowingDate);
  if (offset < -MAX_PAST_SOWING_DAYS || offset > MAX_FUTURE_SOWING_DAYS) {
    throw new AppError("bad_request", `Sowing date must be within ${MAX_PAST_SOWING_DAYS} days in the past and one year ahead.`);
  }

  const texture = profile.soilTexture ?? context.soil.texture;
  const forecastDays = context.forecast?.days ?? [];
  const observed = context.forecast?.rootZoneSoilMoisture ?? null;
  const sowingInForecast = forecastDays.some((d) => d.date === profile.sowingDate);
  const useObserved = sowingInForecast && observed !== null;
  const { fieldCapacity, wiltingPoint } = hydraulicsFor(texture);
  const observedFraction = useObserved ? clamp01((observed - wiltingPoint) / (fieldCapacity - wiltingPoint)) : undefined;

  const currentYear = Number(context.today.slice(0, 4));
  const years = env().ENSEMBLE_YEARS;
  const history = await getDailyHistory(profile.place.lat, profile.place.lon, currentYear - years - 2, addDays(context.today, -HISTORY_LAG_DAYS));

  const scenarios = assembleScenarios({
    sowingDate: profile.sowingDate,
    seasonDays: SEASON_DAYS,
    history: history.days as ReadonlyMap<string, HistoricalDay>,
    historyEnd: history.lastDate,
    forecast: forecastDays,
    years,
    latestYear: currentYear,
    texture,
    useHistoricalInitialMoisture: !useObserved,
  });
  if (scenarios.length === 0) {
    throw new AppError("upstream_unavailable", "Not enough historical weather for this location to build the ensemble.");
  }
  logger.debug("ensemble prepared", { members: scenarios.length, useObserved, texture });

  return {
    context,
    base: {
      place: profile.place,
      sowingDate: profile.sowingDate,
      field: {
        texture,
        soilCard: profile.soilCard,
        water: profile.water,
        irrigationMethod: profile.irrigationMethod,
        initialMoistureFraction: observedFraction ?? DEFAULT_INITIAL_MOISTURE,
      },
      scenarios,
      dataSources: context.dataSources,
      previousCropId: resolveCropId(profile.previousCrop),
    },
  };
}

const cache = new TtlCache<SimulateResponse>(6 * 60 * 60 * 1000, 300);

export async function simulateCrop(req: SimulateRequest): Promise<SimulateResponse> {
  const crop = getCrop(req.cropId);
  if (!crop) throw new AppError("not_found", `Unknown crop "${req.cropId}". See GET /api/v1/crops.`);

  return cache.getOrLoad(stableHash(req), async () => {
    const { context, base } = await prepareRun(req);
    const warnings = [...context.warnings];
    const result = runEnsemble({ ...base, crop });
    const { analysis } = result;
    let { simulation } = result;

    if (req.narrate && isAiConfigured()) {
      try {
        simulation = await narrateSimulation(simulation, analysis, req.lang);
      } catch (err) {
        logger.warn("narration failed", { error: String(err) });
        warnings.push("The AI narrative is unavailable right now; the simulation itself is complete.");
      }
    }

    recordInBackground((repo) =>
      repo.saveAdvisory({
        id: simulation.id,
        kind: "simulation",
        createdAt: new Date().toISOString(),
        state: req.place.state,
        district: req.place.district,
        lat: anonymiseCoord(req.place.lat),
        lon: anonymiseCoord(req.place.lon),
        sowingDate: req.sowingDate,
        water: req.water,
        cropIds: [crop.id],
        lang: req.lang,
      }),
    );

    return { simulation, analysis, soil: { texture: base.field.texture, source: context.soil.source }, warnings };
  });
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
