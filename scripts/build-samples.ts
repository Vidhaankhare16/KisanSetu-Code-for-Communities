/**
 * Generates sample seasons (simulation + analysis) used by the landing page and as the
 * simulator's instant demo:  npm run data:samples [sowing-date]
 *
 * If Gemini is unavailable, an existing English narrative in the sample file is kept.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
    const path = `data/samples/${sample.file}.json`;
    const previous = existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as { simulation?: { narrative?: unknown }; narrative?: unknown }) : null;
    const res = await simulateCrop(SimulateRequestSchema.parse({ ...sample.request, sowingDate, lang: "en", narrate: true }));
    const narrative = res.simulation.narrative ?? previous?.simulation?.narrative ?? previous?.narrative;
    const simulation = narrative ? { ...res.simulation, narrative } : res.simulation;
    writeFileSync(path, JSON.stringify({ simulation, analysis: res.analysis }));
    console.log(
      `✓ ${sample.file}: ${simulation.durationDays} days, ${simulation.outcome.expectedYieldQuintalPerAcre} q/acre${res.warnings.length ? ` (${res.warnings.join("; ")})` : ""}`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
