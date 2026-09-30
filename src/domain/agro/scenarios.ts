/**
 * Builds the weather ensemble for a season: for each recent year with complete records,
 * take the weather observed on the same calendar days, then overwrite the first days with
 * the live forecast. Each member also carries that year's satellite-derived soil moisture
 * at sowing, so wet and dry post-monsoon starts are both represented.
 */
import type { SoilTexture } from "@/contracts/farm";
import { addDays, withYear } from "@/domain/time";
import { hydraulicsFor } from "./soil";
import type { DailyWeather, WeatherScenario } from "./weather";

export interface HistoricalDay {
  tMax: number;
  tMin: number;
  rain: number;
  et0: number;
  rhMean?: number;
  rootWetness?: number;
}

export interface ScenarioAssemblyInput {
  sowingDate: string;
  seasonDays: number;
  history: ReadonlyMap<string, HistoricalDay>;
  /** Most recent date with historical data. */
  historyEnd: string;
  forecast: readonly DailyWeather[];
  years: number;
  /** Search backwards from this year. */
  latestYear: number;
  texture: SoilTexture;
  /** When false, every member starts from the same (observed) soil moisture. */
  useHistoricalInitialMoisture: boolean;
}

/** Share of missing historical days tolerated in one member (filled from the previous day). */
const MAX_GAP_SHARE = 0.05;
const OLDEST_YEAR_OFFSET = 25;

/** Converts root-zone wetness (fraction of saturation) to fraction of plant-available water. */
export function wetnessToAvailableFraction(wetness: number, texture: SoilTexture): number {
  const { fieldCapacity, wiltingPoint, saturation } = hydraulicsFor(texture);
  const theta = wetness * saturation;
  return Math.min(1, Math.max(0, (theta - wiltingPoint) / (fieldCapacity - wiltingPoint)));
}

export function assembleScenarios(input: ScenarioAssemblyInput): WeatherScenario[] {
  const forecastByDate = new Map(input.forecast.map((d) => [d.date, d]));
  const scenarios: WeatherScenario[] = [];

  for (let year = input.latestYear; year > input.latestYear - OLDEST_YEAR_OFFSET && scenarios.length < input.years; year--) {
    const histStart = withYear(input.sowingDate, year);
    if (addDays(histStart, input.seasonDays - 1) > input.historyEnd) continue;

    const days: DailyWeather[] = [];
    let gaps = 0;
    let previous: HistoricalDay | undefined;
    for (let d = 0; d < input.seasonDays; d++) {
      const date = addDays(input.sowingDate, d);
      const forecast = forecastByDate.get(date);
      if (forecast) {
        days.push({ ...forecast, source: "forecast" });
        continue;
      }
      let hist = input.history.get(addDays(histStart, d));
      if (!hist) {
        gaps++;
        hist = previous;
      }
      if (!hist) break;
      previous = hist;
      days.push({ date, tMax: hist.tMax, tMin: hist.tMin, rain: hist.rain, et0: hist.et0, rhMean: hist.rhMean, source: "climatology" });
    }
    if (days.length < input.seasonDays || gaps > input.seasonDays * MAX_GAP_SHARE) continue;

    const wetness = input.history.get(histStart)?.rootWetness;
    scenarios.push({
      id: `y${year}`,
      year,
      days,
      ...(input.useHistoricalInitialMoisture && wetness !== undefined
        ? { initialMoistureFraction: wetnessToAvailableFraction(wetness, input.texture) }
        : {}),
    });
  }
  return scenarios;
}
