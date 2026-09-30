/**
 * Place search across India (Open-Meteo geocoding, GeoNames-based) and reverse geocoding
 * of GPS fixes (OpenStreetMap Nominatim, used within its fair-use policy).
 */
import "server-only";
import { z } from "zod";
import type { Place } from "@/contracts/farm";
import { env } from "@/server/config/env";
import { coordKey, TtlCache } from "@/server/cache";
import { fetchJson } from "@/server/http/fetchJson";

const SearchResponse = z.object({
  results: z
    .array(
      z.object({
        name: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        country_code: z.string().optional(),
        admin1: z.string().optional(),
        admin2: z.string().optional(),
        admin3: z.string().optional(),
        population: z.number().optional(),
      }),
    )
    .optional(),
});

const ReverseResponse = z.object({
  name: z.string().optional(),
  address: z
    .object({
      village: z.string().optional(),
      town: z.string().optional(),
      city: z.string().optional(),
      county: z.string().optional(),
      state_district: z.string().optional(),
      state: z.string().optional(),
    })
    .optional(),
});

const searchCache = new TtlCache<Place[]>(24 * 60 * 60 * 1000, 2000);
const reverseCache = new TtlCache<Place>(24 * 60 * 60 * 1000, 2000);

export async function searchPlaces(query: string, limit = 8): Promise<Place[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  return searchCache.getOrLoad(`${q.toLowerCase()}:${limit}`, async () => {
    const params = new URLSearchParams({ name: q, count: String(limit * 2), language: "en", countryCode: "IN" });
    const res = await fetchJson(`https://geocoding-api.open-meteo.com/v1/search?${params}`, {
      source: "Open-Meteo geocoding",
      schema: SearchResponse,
    });
    return (res.results ?? [])
      .filter((r) => r.country_code === undefined || r.country_code === "IN")
      .slice(0, limit)
      .map((r) => ({
        name: r.name,
        district: r.admin2,
        state: r.admin1,
        lat: round4(r.latitude),
        lon: round4(r.longitude),
      }));
  });
}

export async function reverseGeocode(lat: number, lon: number): Promise<Place> {
  return reverseCache.getOrLoad(coordKey(lat, lon, 3), async () => {
    const params = new URLSearchParams({ format: "jsonv2", lat: String(lat), lon: String(lon), zoom: "12", "accept-language": "en" });
    try {
      const res = await fetchJson(`https://nominatim.openstreetmap.org/reverse?${params}`, {
        source: "OSM Nominatim",
        schema: ReverseResponse,
        headers: { "User-Agent": env().DATA_CONTACT },
        retries: 0,
      });
      const a = res.address ?? {};
      return {
        name: a.village ?? a.town ?? a.city ?? res.name ?? "My field",
        district: a.state_district ?? a.county,
        state: a.state,
        lat: round4(lat),
        lon: round4(lon),
      };
    } catch {
      return { name: `Field at ${lat.toFixed(3)}, ${lon.toFixed(3)}`, lat: round4(lat), lon: round4(lon) };
    }
  });
}

const round4 = (v: number) => Math.round(v * 10_000) / 10_000;
