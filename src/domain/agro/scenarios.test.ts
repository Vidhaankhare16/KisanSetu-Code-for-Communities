import { describe, expect, it } from "vitest";
import { addDays } from "@/domain/time";
import { assembleScenarios, wetnessToAvailableFraction, type HistoricalDay } from "./scenarios";

function history(from: string, to: string, gapEvery?: number): Map<string, HistoricalDay> {
  const map = new Map<string, HistoricalDay>();
  for (let d = from, i = 0; d <= to; d = addDays(d, 1), i++) {
    if (gapEvery && i % gapEvery === 0) continue;
    map.set(d, { tMax: 25 + (i % 3), tMin: 12, rain: i % 10 === 0 ? 5 : 0, et0: 3, rootWetness: 0.4 });
  }
  return map;
}

const base = {
  sowingDate: "2026-11-01",
  seasonDays: 150,
  forecast: [0, 1, 2].map((d) => ({ date: addDays("2026-11-01", d), tMax: 30, tMin: 15, rain: 0, et0: 4, source: "forecast" as const })),
  years: 3,
  latestYear: 2026,
  texture: "loam" as const,
  useHistoricalInitialMoisture: true,
};

describe("scenario assembly", () => {
  it("uses the most recent complete years and skips incomplete ones", () => {
    const hist = history("2019-01-01", "2026-09-25");
    const scenarios = assembleScenarios({ ...base, history: hist, historyEnd: "2026-09-25" });
    // The 2026 season (Nov 2026 → Mar 2027) runs past the end of the record, so it is skipped.
    expect(scenarios.map((s) => s.year)).toEqual([2025, 2024, 2023]);
  });

  it("overlays the live forecast on the first days of every member", () => {
    const hist = history("2019-01-01", "2026-09-25");
    const [first] = assembleScenarios({ ...base, history: hist, historyEnd: "2026-09-25" });
    expect(first!.days.slice(0, 3).every((d) => d.source === "forecast" && d.tMax === 30)).toBe(true);
    expect(first!.days[3]!.source).toBe("climatology");
    expect(first!.days[3]!.date).toBe("2026-11-04");
    expect(first!.days).toHaveLength(150);
  });

  it("carries each year's soil moisture at sowing when requested", () => {
    const hist = history("2019-01-01", "2026-09-25");
    const withMoisture = assembleScenarios({ ...base, history: hist, historyEnd: "2026-09-25" });
    const without = assembleScenarios({ ...base, history: hist, historyEnd: "2026-09-25", useHistoricalInitialMoisture: false });
    expect(withMoisture[0]!.initialMoistureFraction).toBeGreaterThan(0);
    expect(without[0]!.initialMoistureFraction).toBeUndefined();
  });

  it("drops members with too many missing days", () => {
    const patchy = history("2019-01-01", "2026-09-25", 5); // 20% missing
    expect(assembleScenarios({ ...base, history: patchy, historyEnd: "2026-09-25" })).toHaveLength(0);
  });
});

describe("soil wetness conversion", () => {
  it("maps saturation fraction to plant-available fraction", () => {
    expect(wetnessToAvailableFraction(1, "loam")).toBe(1);
    expect(wetnessToAvailableFraction(0.1, "loam")).toBe(0);
    const mid = wetnessToAvailableFraction(0.45, "loam");
    expect(mid).toBeGreaterThan(0.3);
    expect(mid).toBeLessThan(0.8);
  });
});
