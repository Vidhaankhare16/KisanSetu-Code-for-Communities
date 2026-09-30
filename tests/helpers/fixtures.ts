/** Minimal but realistic provider payloads, shaped like the real APIs' responses. */
import { addDays } from "@/domain/time";

export function openMeteoForecast(start: string, days = 16) {
  const dates = Array.from({ length: days }, (_, i) => addDays(start, i));
  const hours = Array.from({ length: 24 }, (_, h) => `${start}T${String(h).padStart(2, "0")}:00`);
  return {
    elevation: 128,
    current: { time: `${start}T10:00`, temperature_2m: 29.4, relative_humidity_2m: 70, precipitation: 0, wind_speed_10m: 6, weather_code: 1 },
    daily: {
      time: dates,
      temperature_2m_max: dates.map((_, i) => 30 - i * 0.2),
      temperature_2m_min: dates.map(() => 18),
      precipitation_sum: dates.map((_, i) => (i === 3 ? 12 : 0)),
      et0_fao_evapotranspiration: dates.map(() => 3.8),
      relative_humidity_2m_mean: dates.map(() => 65),
      precipitation_probability_max: dates.map((_, i) => (i === 3 ? 80 : 5)),
    },
    hourly: {
      time: hours,
      soil_moisture_9_to_27cm: hours.map(() => 0.3),
      soil_moisture_27_to_81cm: hours.map(() => 0.26),
    },
  };
}

/** NASA POWER daily point response covering [startIso, endIso]. */
export function nasaPowerDaily(startIso: string, endIso: string, opts: { missingEvery?: number } = {}) {
  const params = ["T2M_MAX", "T2M_MIN", "PRECTOTCORR", "ALLSKY_SFC_SW_DWN", "RH2M", "WS2M", "GWETROOT"] as const;
  const series: Record<string, Record<string, number>> = Object.fromEntries(params.map((p) => [p, {}]));
  let i = 0;
  for (let d = startIso; d <= endIso; d = addDays(d, 1), i++) {
    const key = d.replaceAll("-", "");
    const month = Number(d.slice(5, 7));
    const winter = month >= 11 || month <= 2;
    const missing = opts.missingEvery !== undefined && i % opts.missingEvery === 0;
    series.T2M_MAX![key] = missing ? -999 : winter ? 23 : 33;
    series.T2M_MIN![key] = winter ? 9 : 22;
    series.PRECTOTCORR![key] = i % 17 === 0 ? 8 : 0;
    series.ALLSKY_SFC_SW_DWN![key] = 16;
    series.RH2M![key] = 55;
    series.WS2M![key] = 1.8;
    series.GWETROOT![key] = 0.45;
  }
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [80.7, 26.9, 126] },
    properties: { parameter: series },
  };
}

export function soilGridsResponse(values: { sand: number | null; clay: number | null; phh2o?: number; soc?: number; nitrogen?: number }) {
  const layer = (name: string, dFactor: number, value: number | null) => ({
    name,
    unit_measure: { d_factor: dFactor },
    depths: ["0-5cm", "5-15cm", "15-30cm"].map((label) => ({ label, values: { mean: value } })),
  });
  return {
    properties: {
      layers: [
        layer("sand", 10, values.sand),
        layer("clay", 10, values.clay),
        layer("silt", 10, values.sand == null || values.clay == null ? null : 1000 - values.sand - values.clay),
        layer("phh2o", 10, values.phh2o ?? 75),
        layer("soc", 10, values.soc ?? 60),
        layer("nitrogen", 100, values.nitrogen ?? 90),
      ],
    },
  };
}

export function modisSubset(points: [string, number][]) {
  return { subset: points.map(([date, raw]) => ({ calendar_date: date, data: [raw] })) };
}
