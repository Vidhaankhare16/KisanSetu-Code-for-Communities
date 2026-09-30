/**
 * ISRIC SoilGrids 2.0 — global 250 m soil property maps predicted from ~240k soil
 * profiles and remote-sensing covariates. Gives texture, pH, organic carbon and nitrogen
 * for any field in India, used when the farmer has no Soil Health Card.
 *
 * Fair use: the public endpoint allows roughly 5 requests per minute per client, so results
 * are cached for a week per ~1 km cell and callers fall back to the state's dominant texture
 * when a lookup is slow or refused. A state deployment should mirror the SoilGrids layers
 * (e.g. in Earth Engine or Cloud Storage) for unthrottled access.
 */
import "server-only";
import { z } from "zod";
import type { SoilTexture } from "@/contracts/farm";
import { classifyTexture } from "@/domain/agro/soil";
import { coordKey, TtlCache } from "@/server/cache";
import { fetchJson } from "@/server/http/fetchJson";
import { logger } from "@/server/logger";

const PROPERTIES = ["sand", "clay", "silt", "phh2o", "soc", "nitrogen"] as const;
const DEPTHS = [
  { label: "0-5cm", thickness: 5 },
  { label: "5-15cm", thickness: 10 },
  { label: "15-30cm", thickness: 15 },
] as const;

const SoilGridsResponse = z.object({
  properties: z.object({
    layers: z.array(
      z.object({
        name: z.string(),
        unit_measure: z.object({ d_factor: z.number() }),
        depths: z.array(z.object({ label: z.string(), values: z.object({ mean: z.number().nullable() }) })),
      }),
    ),
  }),
});

export interface SoilProfile {
  sandPct: number;
  clayPct: number;
  siltPct: number;
  texture: SoilTexture;
  pH: number;
  /** Soil organic carbon (%), comparable to the Soil Health Card "OC" value. */
  organicCarbonPct: number;
  /** Total nitrogen (g/kg). */
  totalNitrogenGkg: number;
  source: "soilgrids";
}

const cache = new TtlCache<SoilProfile | null>(7 * 24 * 60 * 60 * 1000, 1000);

/** Nearby points tried when the exact pixel is masked (built-up land, water bodies). */
const OFFSETS: readonly [number, number][] = [
  [0, 0],
  [0.02, 0.02],
  [-0.02, -0.02],
];

export async function getSoilProfile(lat: number, lon: number): Promise<SoilProfile | null> {
  return cache.getOrLoad(coordKey(lat, lon), async () => {
    for (const [dLat, dLon] of OFFSETS) {
      try {
        const profile = await query(lat + dLat, lon + dLon);
        if (profile) return profile;
      } catch (err) {
        logger.warn("soilgrids query failed", { error: String(err) });
        return null;
      }
    }
    return null;
  });
}

async function query(lat: number, lon: number): Promise<SoilProfile | null> {
  const params = new URLSearchParams({ lat: lat.toFixed(4), lon: lon.toFixed(4), value: "mean" });
  PROPERTIES.forEach((p) => params.append("property", p));
  DEPTHS.forEach((d) => params.append("depth", d.label));
  const res = await fetchJson(`https://rest.isric.org/soilgrids/v2.0/properties/query?${params}`, {
    source: "ISRIC SoilGrids",
    schema: SoilGridsResponse,
    timeoutMs: 25_000,
    retries: 0,
  });

  const value = (name: string): number | null => {
    const layer = res.properties.layers.find((l) => l.name === name);
    if (!layer) return null;
    let sum = 0;
    let weight = 0;
    for (const d of DEPTHS) {
      const v = layer.depths.find((x) => x.label === d.label)?.values.mean;
      if (v == null) continue;
      sum += (v / layer.unit_measure.d_factor) * d.thickness;
      weight += d.thickness;
    }
    return weight > 0 ? sum / weight : null;
  };

  // Mapped units: sand/clay/silt g/kg → %, pH×10 → pH, SOC dg/kg → g/kg, N cg/kg → g/kg
  // (d_factor already converts to the "target" units: %, pH, g/kg, g/kg).
  const sand = value("sand");
  const clay = value("clay");
  const silt = value("silt");
  const ph = value("phh2o");
  const soc = value("soc");
  const nitrogen = value("nitrogen");
  if (sand == null || clay == null) return null;

  return {
    sandPct: round1(sand),
    clayPct: round1(clay),
    siltPct: round1(silt ?? 100 - sand - clay),
    texture: classifyTexture(sand, clay),
    pH: round1(ph ?? 7),
    organicCarbonPct: round2((soc ?? 5) / 10),
    totalNitrogenGkg: round2(nitrogen ?? 0.5),
    source: "soilgrids",
  };
}

const round1 = (v: number) => Math.round(v * 10) / 10;
const round2 = (v: number) => Math.round(v * 100) / 100;
