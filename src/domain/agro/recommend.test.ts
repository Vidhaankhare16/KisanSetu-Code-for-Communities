import { describe, expect, it } from "vitest";
import { syntheticScenario } from "../../../tests/helpers/weather";
import { CROPS } from "@/domain/crops/catalog";
import { candidateCrops, PRIORITY_WEIGHTS, rankCrops } from "./recommend";

const base = {
  place: { name: "Lucknow", state: "Uttar Pradesh", lat: 26.85, lon: 80.95 },
  sowingDate: "2026-11-01",
  field: { texture: "loam" as const, water: "limited" as const, irrigationMethod: "flood" as const, initialMoistureFraction: 0.6 },
  scenarios: [0, 1, 2].map((i) => syntheticScenario({ year: 2021 + i, tMax: 24, tMin: 9, et0: 3, rain: (d) => (d % 20 === 0 ? 8 : 0) })),
  dataSources: [{ name: "Synthetic", kind: "climatology" as const }],
};

describe("candidate crops", () => {
  it("offers rabi crops for a November sowing and excludes kharif crops", () => {
    const ids = candidateCrops("2026-11-01").map((c) => c.id);
    expect(ids).toEqual(expect.arrayContaining(["wheat", "mustard", "chickpea", "lentil", "potato"]));
    expect(ids).not.toContain("rice");
    expect(ids).not.toContain("cotton");
  });

  it("offers kharif crops for a July sowing", () => {
    const ids = candidateCrops("2026-07-01").map((c) => c.id);
    expect(ids).toEqual(expect.arrayContaining(["rice", "soybean", "bajra", "pigeonpea"]));
    expect(ids).not.toContain("wheat");
  });
});

describe("crop ranking", () => {
  it("returns every candidate with contiguous ranks and bounded scores", () => {
    const ranked = rankCrops(base, "balanced");
    expect(ranked.length).toBe(candidateCrops(base.sowingDate).length);
    ranked.forEach((r, i) => {
      expect(r.rank).toBe(i + 1);
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
    });
  });

  it("shifts towards water-thrifty crops when the farmer wants to save water", () => {
    // With assured water every crop is irrigated to demand, so water use really differs.
    const pool = CROPS.filter((c) => ["wheat", "chickpea", "potato"].includes(c.id));
    const assured = { ...base, field: { ...base.field, water: "assured" as const } };
    const water = rankCrops(assured, "save_water", pool);
    const rankOf = (id: string) => water.find((r) => r.result.simulation.crop.id === id)!.rank;
    expect(water[0]!.result.simulation.crop.id).not.toBe("potato");
    expect(rankOf("chickpea")).toBeLessThan(rankOf("potato"));
  });

  it("keeps each priority's weights summing to one", () => {
    for (const weights of Object.values(PRIORITY_WEIGHTS)) {
      expect(Object.values(weights).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5);
    }
  });
});
