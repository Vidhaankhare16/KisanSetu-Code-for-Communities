/**
 * Generates sample season simulations used by the landing page and as offline demo data
 * for the visual simulator:  npm run data:samples
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { SimulateRequestSchema } from "@/contracts/api";
import { simulateCrop } from "@/server/services/simulation";

const SAMPLES = [
  {
    file: "mustard-jaipur",
    request: {
      place: { name: "Jaipur", district: "Jaipur", state: "Rajasthan", lat: 26.9124, lon: 75.7873 },
      cropId: "mustard",
      water: "limited",
      irrigationMethod: "sprinkler",
    },
  },
  {
    file: "wheat-ludhiana",
    request: {
      place: { name: "Ludhiana", district: "Ludhiana", state: "Punjab", lat: 30.901, lon: 75.8573 },
      cropId: "wheat",
      water: "assured",
      irrigationMethod: "flood",
    },
  },
] as const;

async function main() {
  const sowingDate = process.argv[2] ?? `${new Date().getFullYear()}-10-25`;
  mkdirSync("data/samples", { recursive: true });
  for (const sample of SAMPLES) {
    const res = await simulateCrop(SimulateRequestSchema.parse({ ...sample.request, sowingDate, lang: "en", narrate: true }));
    writeFileSync(`data/samples/${sample.file}.json`, JSON.stringify(res.simulation));
    console.log(`✓ ${sample.file}: ${res.simulation.durationDays} days, ${res.simulation.outcome.expectedYieldQuintalPerAcre} q/acre`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
