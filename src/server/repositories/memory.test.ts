import { describe, expect, it } from "vitest";
import { MemoryNetworkRepository } from "./memory";
import { anonymiseCoord, type AdvisoryRecord } from "./types";

const advisory = (id: string, state: string, cropIds: string[]): AdvisoryRecord => ({
  id,
  kind: "recommendation",
  createdAt: "2026-10-01T00:00:00Z",
  state,
  lat: 26.9,
  lon: 80.7,
  sowingDate: "2026-10-20",
  water: "limited",
  cropIds,
  lang: "hi",
});

describe("memory network repository", () => {
  it("aggregates activity by state and counts leading crops", async () => {
    const repo = new MemoryNetworkRepository();
    await repo.saveAdvisory(advisory("a", "Uttar Pradesh", ["mustard", "chickpea"]));
    await repo.saveAdvisory(advisory("b", "Uttar Pradesh", ["mustard"]));
    await repo.saveAdvisory(advisory("c", "Rajasthan", ["chickpea"]));
    await repo.saveDiagnosis({
      id: "d",
      createdAt: "2026-10-02T00:00:00Z",
      state: "Rajasthan",
      crop: "Mustard",
      issue: "Aphid",
      issueType: "pest",
      severity: "medium",
      confidence: 0.8,
    });

    const stats = await repo.stats();
    expect(stats.advisories).toBe(3);
    expect(stats.diagnoses).toBe(1);
    expect(stats.byState[0]).toEqual({ state: "Uttar Pradesh", advisories: 2, diagnoses: 0 });
    expect(stats.topCrops[0]).toEqual({ cropId: "mustard", count: 2 });
    expect((await repo.recentDiagnoses(5))[0]!.issue).toBe("Aphid");
  });

  it("returns null for unknown shared plans", async () => {
    expect(await new MemoryNetworkRepository().getRecommendation("rec_missing")).toBeNull();
  });

  it("rounds coordinates to about 10 km", () => {
    expect(anonymiseCoord(26.9234)).toBe(26.9);
    expect(anonymiseCoord(80.7678)).toBe(80.8);
  });
});
