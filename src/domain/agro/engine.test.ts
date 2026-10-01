import { describe, expect, it } from "vitest";
import { syntheticScenario } from "../../../tests/helpers/weather";
import { requireCrop } from "@/domain/crops/catalog";
import { cropCoefficient, effectiveRainfall, findDrySpells, grossIrrigation, simulateSeason, thermalTimeToMaturity, type FieldConditions } from "./engine";

const wheat = requireCrop("wheat");
const field = (overrides: Partial<FieldConditions> = {}): FieldConditions => ({
  texture: "loam",
  water: "assured",
  irrigationMethod: "flood",
  initialMoistureFraction: 0.8,
  ...overrides,
});
// A benign north-Indian rabi season: mild days, cool nights, modest demand.
const rabi = syntheticScenario({ tMax: 24, tMin: 10, et0: 3 });

describe("crop coefficient curve", () => {
  it("follows the FAO-56 shape: flat, rising, flat, falling", () => {
    expect(cropCoefficient(wheat, 0.05)).toBe(wheat.kc.ini);
    expect(cropCoefficient(wheat, 0.6)).toBe(wheat.kc.mid);
    expect(cropCoefficient(wheat, 1)).toBeCloseTo(wheat.kc.end, 5);
    const rising = cropCoefficient(wheat, 0.25);
    expect(rising).toBeGreaterThan(wheat.kc.ini);
    expect(rising).toBeLessThan(wheat.kc.mid);
  });
});

describe("effective rainfall", () => {
  it("discounts drizzle and storm runoff", () => {
    expect(effectiveRainfall(1)).toBe(0.5);
    expect(effectiveRainfall(20)).toBe(20);
    expect(effectiveRainfall(100)).toBe(75);
  });
});

describe("season simulation", () => {
  it("matures wheat in a realistic number of days under benign weather", () => {
    const run = simulateSeason(wheat, field(), rabi);
    expect(run.matured).toBe(true);
    expect(run.durationDays).toBeGreaterThan(110);
    expect(run.durationDays).toBeLessThan(170);
    expect(run.stages.map((s) => s.key)).toEqual(["initial", "development", "mid", "late"]);
  });

  it("scales season length with temperature via thermal time", () => {
    const warm = simulateSeason(wheat, field(), syntheticScenario({ tMax: 27, tMin: 13 }));
    const cool = simulateSeason(wheat, field(), syntheticScenario({ tMax: 20, tMin: 6 }));
    expect(warm.durationDays).toBeLessThan(cool.durationDays);
    expect(thermalTimeToMaturity(wheat)).toBeGreaterThan(1500);
  });

  it("keeps an irrigated crop free of water stress but stresses a rainfed one", () => {
    const irrigated = simulateSeason(wheat, field({ water: "assured" }), rabi);
    const rainfed = simulateSeason(wheat, field({ water: "rainfed" }), rabi);
    expect(irrigated.yieldFactors.water).toBeGreaterThan(0.95);
    expect(rainfed.yieldFactors.water).toBeLessThan(irrigated.yieldFactors.water);
    expect(rainfed.expectedYieldKgHa).toBeLessThan(irrigated.expectedYieldKgHa);
    expect(rainfed.totals.irrigationGrossMm).toBe(0);
    expect(rainfed.drySpells.length).toBeGreaterThan(0);
  });

  it("caps limited water access at three in-season irrigations plus pre-sowing", () => {
    const run = simulateSeason(wheat, field({ water: "limited", initialMoistureFraction: 0.3 }), rabi);
    expect(run.totals.irrigationCount).toBeLessThanOrEqual(4);
  });

  it("uses less pumped water with drip than with flood irrigation", () => {
    const flood = simulateSeason(wheat, field({ irrigationMethod: "flood" }), rabi);
    const drip = simulateSeason(wheat, field({ irrigationMethod: "drip" }), rabi);
    expect(drip.totals.irrigationGrossMm).toBeLessThan(flood.totals.irrigationGrossMm);
    expect(drip.totals.irrigationNetMm).toBe(flood.totals.irrigationNetMm);
  });

  it("never floods a field with less than the practical minimum depth", () => {
    expect(grossIrrigation(10, "flood")).toBe(50);
    expect(grossIrrigation(60, "flood")).toBe(100);
    expect(grossIrrigation(10, "drip")).toBeCloseTo(11.1, 1);
    expect(grossIrrigation(0, "flood")).toBe(0);
  });

  it("penalises terminal heat during grain filling", () => {
    const hotFinish = syntheticScenario({ tMax: (d) => (d > 95 ? 36 : 24), tMin: 10, et0: 3 });
    const run = simulateSeason(wheat, field(), hotFinish);
    expect(run.heatDegreeDays).toBeGreaterThan(0);
    expect(run.yieldFactors.heat).toBeLessThan(1);
  });

  it("rejects an out-of-season crop through the temperature factor", () => {
    const monsoonHeat = syntheticScenario({ tMax: 36, tMin: 26, et0: 5, rain: 6 });
    const run = simulateSeason(wheat, field(), monsoonHeat);
    expect(run.yieldFactors.temperature).toBeLessThan(0.5);
  });

  it("applies soil pH and salinity limits from a soil health card", () => {
    const card = { pH: 9.6, electricalConductivity: 6, organicCarbon: 0.3, nitrogen: 200, phosphorus: 12, potassium: 180 };
    const run = simulateSeason(requireCrop("chickpea"), field({ soilCard: card }), rabi);
    expect(run.yieldFactors.soil).toBeLessThan(0.7);
  });

  it("produces daily values inside the simulator contract ranges", () => {
    const run = simulateSeason(wheat, field({ water: "rainfed" }), rabi);
    for (const d of run.days) {
      expect(d.soilMoisturePct).toBeGreaterThanOrEqual(0);
      expect(d.soilMoisturePct).toBeLessThanOrEqual(100);
      expect(d.waterStress).toBeGreaterThanOrEqual(0);
      expect(d.waterStress).toBeLessThanOrEqual(1);
      expect(d.canopyCover).toBeLessThanOrEqual(1);
      expect(d.health).toBeGreaterThanOrEqual(0);
      expect(d.health).toBeLessThanOrEqual(100);
    }
    const biomass = run.days.map((d) => d.biomassKgHa);
    expect(biomass).toEqual([...biomass].sort((a, b) => a - b));
  });
});

describe("dry spell detection", () => {
  it("finds runs of at least a week under water stress", () => {
    const days = Array.from({ length: 20 }, (_, i) => ({ waterStress: i >= 5 && i < 15 ? 0.4 : 0 }));
    expect(findDrySpells(days as never)).toEqual([{ startDay: 5, endDay: 14 }]);
  });
});
