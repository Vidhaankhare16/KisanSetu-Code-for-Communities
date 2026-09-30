/**
 * Pre-computed sample seasons (see scripts/build-samples.ts), validated at load time.
 * They power the landing page and the simulator's offline demo.
 */
import mustardJaipur from "../../data/samples/mustard-jaipur.json";
import wheatLudhiana from "../../data/samples/wheat-ludhiana.json";
import { SimulationResultSchema, type SimulationResult } from "@/contracts/simulation";

export const SAMPLE_SEASONS: Record<"mustardJaipur" | "wheatLudhiana", SimulationResult> = {
  mustardJaipur: SimulationResultSchema.parse(mustardJaipur),
  wheatLudhiana: SimulationResultSchema.parse(wheatLudhiana),
};
