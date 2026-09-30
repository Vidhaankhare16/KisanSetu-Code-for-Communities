/** Weather inputs consumed by the crop engine. */

export interface DailyWeather {
  /** Calendar date inside the simulated season (ISO `YYYY-MM-DD`). */
  date: string;
  tMax: number;
  tMin: number;
  /** Precipitation (mm/day). */
  rain: number;
  /** Reference evapotranspiration (mm/day). */
  et0: number;
  /** Mean relative humidity (%), when available. */
  rhMean?: number;
  source: "forecast" | "climatology";
}

/**
 * One plausible weather trajectory for the season: real forecast days followed by the
 * weather observed on the same calendar days of a historical year.
 */
export interface WeatherScenario {
  id: string;
  /** Historical year the climatology portion was taken from (absent for pure forecasts). */
  year?: number;
  days: DailyWeather[];
  /** Soil moisture at sowing for this member (fraction of available water); overrides the field default. */
  initialMoistureFraction?: number;
}
