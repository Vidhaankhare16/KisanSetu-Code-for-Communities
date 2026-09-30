"use client";

import type { SimulationResult } from "@/contracts/simulation";

/**
 * Integration point for the cinematic crop simulator built in Google AI Studio
 * (see AI_STUDIO_SIMULATOR_PROMPT.md). It receives the same `SimulationResult` contract the
 * API returns. Until that component is added this renders nothing and the charts carry the view.
 */
export function SimulatorVisual(_props: { simulation: SimulationResult; day: number }) {
  return null;
}
