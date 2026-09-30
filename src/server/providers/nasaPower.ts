/**
 * NASA POWER (Prediction Of Worldwide Energy Resources), agroclimatology community.
 * Daily satellite-derived and reanalysis weather since 1981: CERES/GEWEX solar radiation,
 * MERRA-2 temperature/humidity/wind and IMERG-corrected precipitation.
 * Used to build the multi-year weather ensemble for the crop simulations.
 */
import "server-only";
import { z } from "zod";
import { hargreavesEt0, penmanMonteithEt0 } from "@/domain/agro/et0";
import { dayOfYear } from "@/domain/time";
import { coordKey, TtlCache } from "@/server/cache";
import { fetchJson } from "@/server/http/fetchJson";

const PARAMETERS = ["T2M_MAX", "T2M_MIN", "PRECTOTCORR", "ALLSKY_SFC_SW_DWN", "RH2M", "WS2M", "GWETROOT"] as const;
const MISSING = -999;

const series = z.record(z.string(), z.number());
const PowerResponse = z.object({
  geometry: z.object({ coordinates: z.tuple([z.number(), z.number(), z.number()]) }),
  properties: z.object({
    parameter: z.object(Object.fromEntries(PARAMETERS.map((p) => [p, series])) as Record<(typeof PARAMETERS)[number], typeof series>),
  }),
});

export interface PowerDay {
  tMax: number;
  tMin: number;
  rain: number;
  et0: number;
  rhMean?: number;
  /** Root-zone soil wetness, 0 (dry) .. 1 (saturated). */
  rootWetness?: number;
}

export interface PowerHistory {
  elevationM: number;
  /** Daily records keyed by ISO date. */
  days: Map<string, PowerDay>;
  firstDate: string;
  lastDate: string;
}

const cache = new TtlCache<PowerHistory>(24 * 60 * 60 * 1000, 200);

/** Daily history for [startYear-01-01, endDate]. Coordinates are snapped to 0.1°. */
export async function getDailyHistory(lat: number, lon: number, startYear: number, endDate: string): Promise<PowerHistory> {
  const la = Math.round(lat * 10) / 10;
  const lo = Math.round(lon * 10) / 10;
  return cache.getOrLoad(`${coordKey(la, lo, 1)}:${startYear}:${endDate}`, async () => {
    const params = new URLSearchParams({
      parameters: PARAMETERS.join(","),
      community: "AG",
      latitude: la.toFixed(1),
      longitude: lo.toFixed(1),
      start: `${startYear}0101`,
      end: endDate.replaceAll("-", ""),
      format: "JSON",
      "time-standard": "LST",
    });
    const res = await fetchJson(`https://power.larc.nasa.gov/api/temporal/daily/point?${params}`, {
      source: "NASA POWER",
      schema: PowerResponse,
      timeoutMs: 45_000,
    });
    return toHistory(res, la);
  });
}

function toHistory(res: z.infer<typeof PowerResponse>, lat: number): PowerHistory {
  const p = res.properties.parameter;
  const elevationM = res.geometry.coordinates[2];
  const days = new Map<string, PowerDay>();
  const valid = (v: number | undefined) => (v === undefined || v === MISSING ? undefined : v);

  for (const key of Object.keys(p.T2M_MAX)) {
    const tMax = valid(p.T2M_MAX[key]);
    const tMin = valid(p.T2M_MIN[key]);
    if (tMax === undefined || tMin === undefined) continue;
    const iso = `${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6, 8)}`;
    const rs = valid(p.ALLSKY_SFC_SW_DWN[key]);
    const rh = valid(p.RH2M[key]);
    const ws = valid(p.WS2M[key]);
    const doy = dayOfYear(iso);
    const et0 =
      rs !== undefined && rh !== undefined && ws !== undefined
        ? penmanMonteithEt0({ tMax, tMin, rhMean: rh, u2: ws, rs, latDeg: lat, elevationM, dayOfYear: doy })
        : hargreavesEt0(tMax, tMin, lat, doy);
    days.set(iso, {
      tMax,
      tMin,
      rain: Math.max(0, valid(p.PRECTOTCORR[key]) ?? 0),
      et0: Math.round(et0 * 100) / 100,
      rhMean: rh,
      rootWetness: valid(p.GWETROOT[key]),
    });
  }

  const dates = [...days.keys()].sort();
  return { elevationM, days, firstDate: dates[0] ?? "", lastDate: dates.at(-1) ?? "" };
}
