import type { DailyWeather, WeatherScenario } from "@/domain/agro/weather";
import { addDays } from "@/domain/time";

export interface SyntheticWeatherOptions {
  start?: string;
  days?: number;
  tMax?: number | ((day: number) => number);
  tMin?: number | ((day: number) => number);
  rain?: number | ((day: number) => number);
  et0?: number | ((day: number) => number);
  rhMean?: number;
  year?: number;
  id?: string;
}

const value = (v: number | ((d: number) => number), d: number) => (typeof v === "function" ? v(d) : v);

/** Builds a deterministic weather scenario for engine tests. */
export function syntheticScenario(opts: SyntheticWeatherOptions = {}): WeatherScenario {
  const { start = "2026-11-01", days = 240, tMax = 24, tMin = 10, rain = 0, et0 = 3.5, rhMean, year, id } = opts;
  const out: DailyWeather[] = [];
  for (let d = 0; d < days; d++) {
    out.push({
      date: addDays(start, d),
      tMax: value(tMax, d),
      tMin: value(tMin, d),
      rain: value(rain, d),
      et0: value(et0, d),
      ...(rhMean !== undefined ? { rhMean } : {}),
      source: "climatology",
    });
  }
  return { id: id ?? `synthetic-${year ?? 0}`, year, days: out };
}
