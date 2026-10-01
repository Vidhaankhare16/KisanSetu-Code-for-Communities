/** The simulator renders the platform's own simulation contract — one source of truth. */
export type {
  EventType,
  Severity,
  SimDataSource,
  SimDay,
  SimEvent,
  SimNarrative,
  SimOutcome,
  SimStage,
  SimulationResult,
  StageKey,
} from "@/contracts/simulation";
export type { SimLocation } from "@/contracts/simulation";
import type { SimulationResult } from "@/contracts/simulation";
export type SimCrop = SimulationResult["crop"];
