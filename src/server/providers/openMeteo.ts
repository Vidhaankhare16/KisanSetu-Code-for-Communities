/**
 * Open-Meteo: 16-day daily forecast (with FAO ET0), current conditions and modelled soil
 * moisture. Free, no key, blends national weather-service models incl. ECMWF/GFS.
 */
import "server-only";
import { z } from "zod";
import type { DailyWeather } from "@/domain/agro/weather";
import { coordKey, TtlCache } from "@/server/cache";
import { fetchJson } from "@/server/http/fetchJson";

const DAILY_VARS = [
  "temperature_2m_max",
  "temperature_2m_min",
  "precipitation_sum",
  "et0_fao_evapotranspiration",
  "relative_humidity_2m_mean",
  "precipitation_probability_max",
] as const;

const nums = z.array(z.number().nullable());
const ForecastResponse = z.object({
  elevation: z.number(),
  current: z
    .object({
      time: z.string(),
      temperature_2m: z.number().nullable(),
      relative_humidity_2m: z.number().nullable(),
      precipitation: z.number().nullable(),
      wind_speed_10m: z.number().nullable(),
      weather_code: z.number().nullable(),
    })
    .optional(),
  daily: z.object({
    time: z.array(z.string()),
    temperature_2m_max: nums,
    temperature_2m_min: nums,
    precipitation_sum: nums,
    et0_fao_evapotranspiration: nums,
    relative_humidity_2m_mean: nums,
    precipitation_probability_max: nums,
  }),
  hourly: z.object({
    time: z.array(z.string()),
    soil_moisture_9_to_27cm: nums,
    soil_moisture_27_to_81cm: nums,
  }),
});

export interface CurrentConditions {
  time: string;
  temperatureC: number | null;
  humidityPct: number | null;
  precipitationMm: number | null;
  windKmh: number | null;
  weatherCode: number | null;
}

export interface Forecast {
  elevationM: number;
  current: CurrentConditions | null;
  days: (DailyWeather & { rainProbabilityPct: number | null })[];
  /** Volumetric soil moisture (m3/m3) now, averaged over the 9-81 cm root zone. */
  rootZoneSoilMoisture: number | null;
}

const cache = new TtlCache<Forecast>(60 * 60 * 1000);

export async function getForecast(lat: number, lon: number): Promise<Forecast> {
  return cache.getOrLoad(coordKey(lat, lon), async () => {
    const params = new URLSearchParams({
      latitude: lat.toFixed(4),
      longitude: lon.toFixed(4),
      daily: DAILY_VARS.join(","),
      hourly: "soil_moisture_9_to_27cm,soil_moisture_27_to_81cm",
      current: "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code",
      forecast_days: "16",
      timezone: "Asia/Kolkata",
    });
    const res = await fetchJson(`https://api.open-meteo.com/v1/forecast?${params}`, {
      source: "Open-Meteo forecast",
      schema: ForecastResponse,
    });
    return toForecast(res);
  });
}

function toForecast(res: z.infer<typeof ForecastResponse>): Forecast {
  const d = res.daily;
  const days = d.time.flatMap((date, i) => {
    const tMax = d.temperature_2m_max[i];
    const tMin = d.temperature_2m_min[i];
    if (tMax == null || tMin == null) return [];
    return [
      {
        date,
        tMax,
        tMin,
        rain: d.precipitation_sum[i] ?? 0,
        et0: d.et0_fao_evapotranspiration[i] ?? 0,
        rhMean: d.relative_humidity_2m_mean[i] ?? undefined,
        rainProbabilityPct: d.precipitation_probability_max[i] ?? null,
        source: "forecast" as const,
      },
    ];
  });

  // Soil moisture "now": the first hourly slot at or after the current time.
  const nowIndex = Math.max(
    0,
    res.hourly.time.findIndex((t) => t >= (res.current?.time ?? "")),
  );
  const shallow = res.hourly.soil_moisture_9_to_27cm[nowIndex];
  const deep = res.hourly.soil_moisture_27_to_81cm[nowIndex];
  // Thickness-weighted mean of the two layers (18 cm and 54 cm).
  const rootZoneSoilMoisture = shallow != null && deep != null ? (shallow * 18 + deep * 54) / 72 : (deep ?? shallow ?? null);

  const c = res.current;
  return {
    elevationM: res.elevation,
    current: c
      ? {
          time: c.time,
          temperatureC: c.temperature_2m,
          humidityPct: c.relative_humidity_2m,
          precipitationMm: c.precipitation,
          windKmh: c.wind_speed_10m,
          weatherCode: c.weather_code,
        }
      : null,
    days,
    rootZoneSoilMoisture,
  };
}
