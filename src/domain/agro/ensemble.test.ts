import { describe, expect, it } from "vitest";
import { syntheticScenario } from "../../../tests/helpers/weather";
import { SimulationResultSchema } from "@/contracts/simulation";
import { requireCrop } from "@/domain/crops/catalog";
import { computeEconomics, fertiliserCorrection, kgPerHaToQuintalPerAcre } from "./economics";
import { percentile, riskScore, runEnsemble, verdictFor, type EnsembleMember } from "./ensemble";
import { assessRegenerative } from "./regenerative";

const place = { name: "Jaipur", state: "Rajasthan", lat: 26.91, lon: 75.79 };
const field = { texture: "loam" as const, water: "limited" as const, irrigationMethod: "flood" as const, initialMoistureFraction: 0.6 };
// Five "historical years" with increasing rainfall.
const scenarios = [0, 1, 2, 3, 4].map((i) =>
  syntheticScenario({ year: 2020 + i, id: `y${i}`, tMax: 24, tMin: 9, et0: 3, rain: (d) => (d % 15 === 0 ? 4 + 6 * i : 0) }),
);
const dataSources = [{ name: "Synthetic test weather", kind: "climatology" as const }];

describe("percentile", () => {
  it("interpolates linearly between ranks", () => {
    expect(percentile([1, 2, 3, 4, 5], 50)).toBe(3);
    expect(percentile([10, 20], 50)).toBe(15);
    expect(percentile([], 50)).toBe(0);
  });
});

describe("ensemble run", () => {
  const { simulation, analysis } = runEnsemble({ crop: requireCrop("mustard"), place, sowingDate: "2026-11-01", field, scenarios, dataSources });

  it("satisfies the simulator contract", () => {
    expect(() => SimulationResultSchema.parse(simulation)).not.toThrow();
    expect(simulation.durationDays).toBe(simulation.days.length);
    expect(simulation.harvestDate).toBe(simulation.days.at(-1)!.date);
  });

  it("uses the median-yield year as the trace so numbers and animation agree", () => {
    expect(simulation.outcome.expectedYieldKgHa).toBe(simulation.ensemble!.yieldKgHa.p50);
    expect(analysis.members).toHaveLength(5);
    expect(simulation.ensemble!.years).toEqual([2020, 2021, 2022, 2023, 2024]);
  });

  it("orders percentiles and keeps probabilities in range", () => {
    const { yieldKgHa, probDrySpell, probLoss } = simulation.ensemble!;
    expect(yieldKgHa.p10).toBeLessThanOrEqual(yieldKgHa.p50);
    expect(yieldKgHa.p50).toBeLessThanOrEqual(yieldKgHa.p90);
    for (const p of [probDrySpell, probLoss]) expect(p).toBeGreaterThanOrEqual(0);
  });

  it("builds a timeline that starts with sowing and ends with harvest", () => {
    expect(simulation.events[0]!.type).toBe("sowing");
    expect(simulation.events.at(-1)!.type).toBe("harvest");
    expect(simulation.events.some((e) => e.type === "stage_change")).toBe(true);
  });

  it("produces a stable id for identical inputs", () => {
    const again = runEnsemble({ crop: requireCrop("mustard"), place, sowingDate: "2026-11-01", field, scenarios, dataSources });
    expect(again.simulation.id).toBe(simulation.id);
  });
});

describe("heavy rain events", () => {
  it("flags IMD heavy and very heavy rainfall days", () => {
    const storm = syntheticScenario({ rain: (d) => (d === 40 ? 130 : d === 60 ? 70 : 0), tMax: 24, tMin: 10 });
    const { simulation } = runEnsemble({ crop: requireCrop("wheat"), place, sowingDate: "2026-11-15", field, scenarios: [storm], dataSources });
    const rainEvents = simulation.events.filter((e) => e.type === "heavy_rain");
    expect(rainEvents.map((e) => e.severity)).toEqual(["critical", "warning"]);
  });
});

describe("risk and verdict", () => {
  const member = (o: Partial<EnsembleMember>): EnsembleMember => ({
    scenarioId: "x",
    yieldKgHa: 2000,
    netProfitPerAcreInr: 20000,
    irrigationGrossMm: 100,
    matured: true,
    drySpellDays: 0,
    heatDegreeDays: 0,
    coldDegreeDays: 0,
    ...o,
  });

  it("scores a stable, profitable crop as low risk", () => {
    expect(riskScore([member({}), member({}), member({})])).toBeLessThan(10);
  });

  it("scores frequent losses and immature seasons as high risk", () => {
    const risky = [member({ netProfitPerAcreInr: -5000, yieldKgHa: 300, matured: false }), member({ netProfitPerAcreInr: -1000, yieldKgHa: 900 })];
    expect(riskScore(risky)).toBeGreaterThan(60);
  });

  it("derives verdicts from profit, risk and yield ratio", () => {
    expect(verdictFor(30000, 20, 0.8, true)).toBe("recommended");
    expect(verdictFor(30000, 60, 0.8, true)).toBe("caution");
    expect(verdictFor(-100, 10, 0.9, true)).toBe("not_recommended");
    expect(verdictFor(30000, 10, 0.9, false)).toBe("not_recommended");
  });
});

describe("economics", () => {
  it("converts kg/ha to quintal/acre", () => {
    expect(kgPerHaToQuintalPerAcre(4942)).toBeCloseTo(20, 0);
  });

  it("adds irrigation energy and soil-card corrections to the cost", () => {
    const wheat = requireCrop("wheat");
    const card = { pH: 7.5, electricalConductivity: 0.4, organicCarbon: 0.4, nitrogen: 200, phosphorus: 8, potassium: 250 };
    const dry = computeEconomics(wheat, 4000, 0);
    const irrigated = computeEconomics(wheat, 4000, 300, card);
    expect(irrigated.costPerAcreInr).toBeGreaterThan(dry.costPerAcreInr);
    expect(fertiliserCorrection(wheat, card)).toBe(2200);
    expect(fertiliserCorrection(requireCrop("chickpea"), card)).toBe(1000);
  });
});

describe("regenerative assessment", () => {
  it("rewards a rainfed legume after a cereal", () => {
    const pulse = assessRegenerative(requireCrop("chickpea"), 0, "rice");
    const repeatRice = assessRegenerative(requireCrop("rice"), 700, "rice");
    expect(pulse.score).toBeGreaterThan(80);
    expect(repeatRice.score).toBeLessThan(25);
    expect(pulse.factors.reduce((a, f) => a + f.max, 0)).toBe(100);
  });
});
