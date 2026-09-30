import { CROPS } from "@/domain/crops/catalog";
import { apiHandler, corsPreflight } from "@/server/http/apiHandler";

/** Lightweight crop list for pickers; full parameters live under /api/v1/models. */
export const GET = apiHandler({}, async () => ({
  crops: CROPS.map((c) => ({
    id: c.id,
    name: c.name,
    localName: c.localName,
    category: c.category,
    durationDays: c.durationDays,
    seasons: [...new Set(c.sowingWindows.map((w) => w.season))],
    waterIntensity: c.waterIntensity,
  })),
}));

export const OPTIONS = corsPreflight;
