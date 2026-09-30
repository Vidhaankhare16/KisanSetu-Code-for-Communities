import { describe, expect, it } from "vitest";
import { RecommendRequestSchema, SimulateRequestSchema } from "@/contracts/api";
import { SimulationResultSchema } from "@/contracts/simulation";
import { isAiConfigured } from "@/server/config/env";
import { recommendCrops } from "@/server/services/recommendation";
import { simulateCrop } from "@/server/services/simulation";

const today = new Date().toISOString().slice(0, 10);
const place = { name: "Malihabad", district: "Lucknow", state: "Uttar Pradesh", lat: 26.92, lon: 80.71 };

describe("live pipeline (real open data)", () => {
  it("recommends rabi crops for an Uttar Pradesh field after paddy", async () => {
    const res = await recommendCrops(
      RecommendRequestSchema.parse({ place, sowingDate: today, water: "limited", previousCrop: "rice", advise: isAiConfigured() }),
    );
    for (const r of res.ranking) {
      console.log(
        `#${r.rank} ${r.crop.id.padEnd(10)} ${String(r.score).padStart(3)} ${r.outcome.verdict.padEnd(15)} ${r.outcome.expectedYieldQuintalPerAcre} q/ac  profit P10/P50 ${r.ensemble.netProfitPerAcreInr.p10}/${r.ensemble.netProfitPerAcreInr.p50}  irr ${r.ensemble.irrigationMm.p50} mm  ${r.durationDays} d → ${r.harvestDate}`,
      );
    }
    console.log("advisory:", JSON.stringify(res.advisory, null, 1)?.slice(0, 1500));
    expect(res.ranking.length).toBeGreaterThan(3);
    expect(res.topSimulations).toHaveLength(3);
    res.topSimulations.forEach((s) => SimulationResultSchema.parse(s));
    if (isAiConfigured()) expect(res.advisory?.crops.length).toBeGreaterThan(0);
  });

  it("simulates and narrates a crop in Hindi", async () => {
    const res = await simulateCrop(
      SimulateRequestSchema.parse({ place, sowingDate: today, cropId: "mustard", water: "limited", lang: "hi" }),
    );
    console.log("narrative:", res.simulation.narrative, "first events:", res.simulation.events.slice(0, 3));
    expect(res.simulation.days.length).toBe(res.simulation.durationDays);
    if (isAiConfigured()) expect(res.simulation.narrative?.headline.length).toBeGreaterThan(5);
  });
});
