/**
 * Builds the national rabi outlook shown on the network dashboard by running the crop model
 * for representative agricultural districts in every region of India.
 *
 *   npm run data:outlook            # rabi sowing on 1 Nov of the current year
 *   npm run data:outlook -- 2026-11-15
 *
 * Output: data/outlook/rabi.json (committed, so the dashboard needs no batch job at runtime).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { RecommendRequestSchema } from "@/contracts/api";
import { searchPlaces } from "@/server/providers/geocoding";
import { recommendCrops } from "@/server/services/recommendation";

const DISTRICTS: [district: string, state: string][] = [
  ["Ludhiana", "Punjab"],
  ["Bathinda", "Punjab"],
  ["Karnal", "Haryana"],
  ["Hisar", "Haryana"],
  ["Meerut", "Uttar Pradesh"],
  ["Lucknow", "Uttar Pradesh"],
  ["Gorakhpur", "Uttar Pradesh"],
  ["Jhansi", "Uttar Pradesh"],
  ["Patna", "Bihar"],
  ["Purnia", "Bihar"],
  ["Bardhaman", "West Bengal"],
  ["Cuttack", "Odisha"],
  ["Bhawanipatna", "Odisha"],
  ["Ranchi", "Jharkhand"],
  ["Raipur", "Chhattisgarh"],
  ["Indore", "Madhya Pradesh"],
  ["Jabalpur", "Madhya Pradesh"],
  ["Sagar", "Madhya Pradesh"],
  ["Jaipur", "Rajasthan"],
  ["Bikaner", "Rajasthan"],
  ["Kota", "Rajasthan"],
  ["Rajkot", "Gujarat"],
  ["Palanpur", "Gujarat"],
  ["Anand", "Gujarat"],
  ["Nashik", "Maharashtra"],
  ["Akola", "Maharashtra"],
  ["Latur", "Maharashtra"],
  ["Warangal", "Telangana"],
  ["Nizamabad", "Telangana"],
  ["Guntur", "Andhra Pradesh"],
  ["Anantapur", "Andhra Pradesh"],
  ["Dharwad", "Karnataka"],
  ["Raichur", "Karnataka"],
  ["Mandya", "Karnataka"],
  ["Thanjavur", "Tamil Nadu"],
  ["Coimbatore", "Tamil Nadu"],
  ["Palakkad", "Kerala"],
  ["Nagaon", "Assam"],
  ["Mandi", "Himachal Pradesh"],
  ["Jammu", "Jammu and Kashmir"],
  ["Rudrapur", "Uttarakhand"],
  ["Agartala", "Tripura"],
];

const CONCURRENCY = 3;

/**
 * States where most cropland has assured irrigation (net irrigated area ≥ ~75% of net sown
 * area, Land Use Statistics). Elsewhere the outlook assumes limited irrigation.
 */
const ASSURED_IRRIGATION_STATES = new Set(["Punjab", "Haryana", "Uttar Pradesh"]);

async function main() {
  const year = new Date().getFullYear();
  const sowingDate = process.argv[2] ?? `${year}-11-01`;
  const results: unknown[] = [];
  const queue = [...DISTRICTS];

  async function worker() {
    for (let next = queue.shift(); next; next = queue.shift()) {
      const [district, state] = next;
      try {
        const [place] = (await searchPlaces(`${district}`, 10)).filter((p) => p.state === state);
        if (!place) throw new Error("not geocoded");
        const water = ASSURED_IRRIGATION_STATES.has(state) ? "assured" : "limited";
        const rec = await recommendCrops(RecommendRequestSchema.parse({ place: { ...place, district, state }, sowingDate, water, advise: false }));
        results.push({
          district,
          state,
          lat: place.lat,
          lon: place.lon,
          water,
          soil: rec.soil,
          top: rec.ranking.slice(0, 3).map((r) => ({
            cropId: r.crop.id,
            score: r.score,
            verdict: r.outcome.verdict,
            yieldQuintalPerAcre: r.outcome.expectedYieldQuintalPerAcre,
            profitP10: r.ensemble.netProfitPerAcreInr.p10,
            profitP50: r.ensemble.netProfitPerAcreInr.p50,
            irrigationMm: r.ensemble.irrigationMm.p50,
            probDrySpell: r.ensemble.probDrySpell,
            probHeatStress: r.ensemble.probHeatStress,
            regenerativeScore: r.outcome.regenerativeScore,
          })),
        });
        console.log(
          `✓ ${district}, ${state}: ${rec.ranking
            .slice(0, 3)
            .map((r) => r.crop.id)
            .join(", ")}`,
        );
      } catch (err) {
        console.warn(`✗ ${district}, ${state}: ${err instanceof Error ? err.message : err}`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  mkdirSync("data/outlook", { recursive: true });
  writeFileSync(
    "data/outlook/rabi.json",
    JSON.stringify(
      {
        season: "rabi",
        sowingDate,
        generatedAt: new Date().toISOString(),
        method: "KisanSetu crop model over a 10-year NASA POWER weather ensemble plus the live 16-day forecast",
        districts: results.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
      },
      null,
      1,
    ),
  );
  console.log(`Wrote ${results.length}/${DISTRICTS.length} districts to data/outlook/rabi.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
