/**
 * Pre-computed sample seasons (see scripts/build-samples.ts), validated at load time.
 * They power the landing page and give the simulator an instant demo.
 */
import mustardJaipur from "../../data/samples/mustard-jaipur.json";
import wheatLudhiana from "../../data/samples/wheat-ludhiana.json";
import { SimulateResponseSchema } from "@/contracts/api";
import type { SimulationResult } from "@/contracts/simulation";

const SampleSchema = SimulateResponseSchema.pick({ simulation: true, analysis: true });

const parse = (raw: unknown) => SampleSchema.parse(raw);

export const SAMPLES = [parse(mustardJaipur), parse(wheatLudhiana)];

export const SAMPLE_SEASONS: Record<"mustardJaipur" | "wheatLudhiana", SimulationResult> = {
  mustardJaipur: SAMPLES[0]!.simulation,
  wheatLudhiana: SAMPLES[1]!.simulation,
};
