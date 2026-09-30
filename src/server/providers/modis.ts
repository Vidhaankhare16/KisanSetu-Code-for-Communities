/**
 * MODIS Terra MOD13Q1 vegetation index (NDVI, 250 m, 16-day composites) via the ORNL DAAC
 * web service. Tells us how green the land around the field is now and a year ago —
 * e.g. whether the kharif crop is still standing when the farmer plans rabi sowing.
 */
import "server-only";
import { z } from "zod";
import { addDays, dayOfYear, parseIsoDate, toIsoDate } from "@/domain/time";
import { coordKey, TtlCache } from "@/server/cache";
import { fetchJson } from "@/server/http/fetchJson";

const SubsetResponse = z.object({
  subset: z.array(z.object({ calendar_date: z.string(), data: z.array(z.number()) })),
});

const SCALE = 0.0001;
const FILL = -3000;
/** The service returns at most 10 composites per request (~160 days). */
const WINDOW_DAYS = 150;

export interface NdviPoint {
  date: string;
  ndvi: number;
}

export interface VegetationCondition {
  series: NdviPoint[];
  latest: NdviPoint | null;
  yearAgo: NdviPoint | null;
  /** Qualitative label for the latest composite. */
  cover: "bare" | "sparse" | "moderate" | "dense";
}

const cache = new TtlCache<VegetationCondition>(12 * 60 * 60 * 1000, 500);

export function modisDate(iso: string): string {
  return `A${iso.slice(0, 4)}${String(dayOfYear(iso)).padStart(3, "0")}`;
}

export function coverLabel(ndvi: number): VegetationCondition["cover"] {
  if (ndvi < 0.2) return "bare";
  if (ndvi < 0.35) return "sparse";
  if (ndvi < 0.55) return "moderate";
  return "dense";
}

/** NDVI over the last ~13 months ending `today`. */
export async function getVegetation(lat: number, lon: number, today: string): Promise<VegetationCondition> {
  return cache.getOrLoad(`${coordKey(lat, lon)}:${today.slice(0, 7)}`, async () => {
    const windows: [string, string][] = [];
    for (let end = today; windows.length < 3; end = addDays(end, -WINDOW_DAYS - 1)) {
      windows.push([addDays(end, -WINDOW_DAYS), end]);
    }
    const parts = await Promise.all(
      windows.map(([from, to]) => {
        const params = new URLSearchParams({
          latitude: lat.toFixed(4),
          longitude: lon.toFixed(4),
          band: "250m_16_days_NDVI",
          startDate: modisDate(from),
          endDate: modisDate(to),
          kmAboveBelow: "0",
          kmLeftRight: "0",
        });
        return fetchJson(`https://modis.ornl.gov/rst/api/v1/MOD13Q1/subset?${params}`, {
          source: "MODIS NDVI (ORNL DAAC)",
          schema: SubsetResponse,
          timeoutMs: 30_000,
        });
      }),
    );

    const series = parts
      .flatMap((p) => p.subset)
      .flatMap((s) => {
        const raw = s.data[0];
        return raw === undefined || raw <= FILL ? [] : [{ date: s.calendar_date, ndvi: Math.round(raw * SCALE * 1000) / 1000 }];
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    const latest = series.at(-1) ?? null;
    const yearAgo = latest ? nearest(series, toIsoDate(new Date(parseIsoDate(latest.date).getTime() - 365 * 86_400_000))) : null;
    return { series, latest, yearAgo, cover: latest ? coverLabel(latest.ndvi) : "sparse" };
  });
}

function nearest(series: NdviPoint[], iso: string): NdviPoint | null {
  const target = parseIsoDate(iso).getTime();
  let best: NdviPoint | null = null;
  let bestGap = 20 * 86_400_000; // must be within ~one composite
  for (const p of series) {
    const gap = Math.abs(parseIsoDate(p.date).getTime() - target);
    if (gap < bestGap) {
      best = p;
      bestGap = gap;
    }
  }
  return best;
}
