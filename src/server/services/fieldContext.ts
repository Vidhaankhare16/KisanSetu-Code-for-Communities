/**
 * Gathers everything we can learn about a field from open data, in parallel and failure-
 * tolerant: a slow or unavailable source degrades the answer but never breaks it.
 */
import "server-only";
import type { Place, SoilTexture } from "@/contracts/farm";
import type { SimDataSource } from "@/contracts/simulation";
import { findState } from "@/domain/geo/india";
import { env } from "@/server/config/env";
import { toIsoDate } from "@/domain/time";
import { getForecast, type Forecast } from "@/server/providers/openMeteo";
import { getVegetation, type VegetationCondition } from "@/server/providers/modis";
import { getSoilProfile, type SoilProfile } from "@/server/providers/soilGrids";
import { logger } from "@/server/logger";

export type SoilSource = "farmer" | "soilgrids" | "regional_default";

export interface FieldContext {
  place: Place;
  today: string;
  forecast: Forecast | null;
  soil: { texture: SoilTexture; source: SoilSource; profile: SoilProfile | null; note?: string };
  vegetation: VegetationCondition | null;
  dataSources: SimDataSource[];
  warnings: string[];
}

export interface FieldContextOptions {
  /** Texture chosen by the farmer; skips the soil lookup when present. */
  texture?: SoilTexture;
  today?: string;
}

/**
 * SoilGrids can take 20 s+ on a cold query. Interactive requests wait SOIL_DEADLINE_MS, then
 * fall back; the lookup keeps running and fills the cache, so the next request for this area
 * gets real soil data. Batch jobs raise the deadline.
 */
const VEGETATION_DEADLINE_MS = 12000;

export async function getFieldContext(place: Place, opts: FieldContextOptions = {}): Promise<FieldContext> {
  const today = opts.today ?? toIsoDate(new Date());
  const [forecast, soil, vegetation] = await Promise.allSettled([
    getForecast(place.lat, place.lon),
    opts.texture ? Promise.resolve(null) : withDeadline(getSoilProfile(place.lat, place.lon), env().SOIL_DEADLINE_MS),
    withDeadline(getVegetation(place.lat, place.lon, today), VEGETATION_DEADLINE_MS),
  ]);

  const warnings: string[] = [];
  const dataSources: SimDataSource[] = [];
  const settled = <T>(r: PromiseSettledResult<T>, label: string): T | null => {
    if (r.status === "fulfilled") return r.value;
    warnings.push(`${label} is temporarily unavailable; using fallbacks.`);
    logger.warn("field context source failed", { label, error: String(r.reason) });
    return null;
  };

  const fc = settled(forecast, "Weather forecast");
  const profile = settled(soil, "Soil map");
  const veg = settled(vegetation, "Satellite vegetation index");

  if (fc) dataSources.push({ name: "Open-Meteo 16-day forecast", kind: "forecast" });
  dataSources.push({ name: "NASA POWER daily climatology (satellite + reanalysis)", kind: "climatology" });
  if (veg?.latest) dataSources.push({ name: "MODIS Terra NDVI (250 m)", kind: "satellite" });

  let soilInfo: FieldContext["soil"];
  if (opts.texture) {
    soilInfo = { texture: opts.texture, source: "farmer", profile: null };
  } else if (profile) {
    soilInfo = { texture: profile.texture, source: "soilgrids", profile };
    dataSources.push({ name: "ISRIC SoilGrids 250 m", kind: "soil" });
  } else {
    const state = findState(place.state);
    soilInfo = {
      texture: state?.dominantTexture ?? "loam",
      source: "regional_default",
      profile: null,
      note: state ? state.soilNote : "Soil data unavailable; assuming loam.",
    };
    warnings.push("Soil texture is a regional default — add your Soil Health Card for precise advice.");
  }
  dataSources.push({ name: "KisanSetu crop model (FAO-56 water balance)", kind: "model" });

  return { place, today, forecast: fc, soil: soilInfo, vegetation: veg, dataSources, warnings };
}

/** Rejects if `promise` has not settled within `ms`; the underlying work is not cancelled. */
export function withDeadline<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`deadline of ${ms} ms exceeded`)), ms);
  });
  return Promise.race([promise, deadline]).finally(() => clearTimeout(timer));
}
