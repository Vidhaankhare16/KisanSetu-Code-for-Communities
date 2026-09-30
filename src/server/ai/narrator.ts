/**
 * Narrator agent: writes the simulation's headline/bullets and, for non-English users,
 * translates the stage and event texts — one call, validated to preserve structure.
 */
import "server-only";
import { LocalizedSimulationSchema } from "@/contracts/ai";
import type { Lang } from "@/contracts/farm";
import type { SimulationResult } from "@/contracts/simulation";
import type { SimulationAnalysis } from "@/domain/agro/ensemble";
import { logger } from "@/server/logger";
import { generateStructured } from "./gemini";
import { GROUNDING_RULES, languageInstruction, PERSONA } from "./prompts";

export async function narrateSimulation(
  simulation: SimulationResult,
  analysis: SimulationAnalysis,
  lang: Lang,
): Promise<SimulationResult> {
  const data = {
    crop: `${simulation.crop.name} (${simulation.crop.localName})`,
    place: simulation.location,
    sowingDate: simulation.sowingDate,
    harvestDate: simulation.harvestDate,
    outcome: simulation.outcome,
    ensemble: simulation.ensemble,
    yieldFactors: analysis.yieldFactors,
    waterBalance: analysis.waterBalance,
    stages: simulation.stages.map((s) => ({ label: s.label, description: s.description })),
    events: simulation.events.map((e) => ({ title: e.title, detail: e.detail, action: e.action })),
  };

  const localized = await generateStructured({
    task: "narrator.simulation",
    schema: LocalizedSimulationSchema,
    system: `${PERSONA}

You narrate a season-long crop simulation for a farmer.
${GROUNDING_RULES}
- headline: one line with the verdict and the expected profit per acre.
- bullets: 3-4 points — what drives the yield, the riskiest moment, and the one action that matters most.
- stages and events: return them in the SAME ORDER and SAME COUNT as given, translated faithfully
  (keep numbers, dates and doses unchanged). Keep "action" absent when it is absent in the input.
${languageInstruction(lang)}`,
    input: `DATA:\n${JSON.stringify(data)}`,
    thinking: "low",
    temperature: 0.3,
  });

  const result: SimulationResult = { ...simulation, narrative: { headline: localized.headline, bullets: localized.bullets } };
  if (lang === "en") return result;

  if (localized.stages.length !== simulation.stages.length || localized.events.length !== simulation.events.length) {
    logger.warn("narrator returned mismatched translation; keeping English timeline", { lang });
    return result;
  }
  return {
    ...result,
    stages: simulation.stages.map((s, i) => ({ ...s, ...localized.stages[i] })),
    events: simulation.events.map((e, i) => {
      const t = localized.events[i]!;
      return { ...e, title: t.title, detail: t.detail, ...(e.action && t.action ? { action: t.action } : {}) };
    }),
  };
}
