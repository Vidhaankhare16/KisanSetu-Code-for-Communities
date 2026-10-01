/** Small colour and randomness helpers for the procedural crop illustrations. */
import type { StageKey } from "@/contracts/simulation";

/** Linear blend of two #rrggbb colours (t = 0 → a, 1 → b). */
export function mix(a: string, b: string, t: number): string {
  const k = Math.min(1, Math.max(0, t));
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (shift: number) => Math.round(((pa >> shift) & 255) * (1 - k) + ((pb >> shift) & 255) * k);
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`;
}

/** Deterministic pseudo-random sequence (mulberry32) so the same plant always looks the same. */
export function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface PlantTint {
  leaf: string;
  leafDark: string;
  stem: string;
}

const HEALTHY = { leaf: "#4f9a3e", leafDark: "#2f7432", stem: "#5c8a3a" };
const STRESSED = { leaf: "#a5a447", leafDark: "#7f7f34", stem: "#8a8a44" };
const SENESCENT = { leaf: "#c8a457", leafDark: "#a8843f", stem: "#b08d4e" };

/**
 * Foliage colour from the model's crop state: water stress and poor health pull the green
 * towards olive; the late stage ripens it towards straw.
 */
export function plantTint(health: number, waterStress: number, stage: StageKey, stageProgress: number): PlantTint {
  const stress = Math.max(waterStress, 1 - health / 100);
  const ripen = stage === "late" ? Math.min(1, 0.25 + stageProgress * 0.9) : 0;
  const pick = (key: keyof PlantTint) => mix(mix(HEALTHY[key], STRESSED[key], stress * 0.9), SENESCENT[key], ripen);
  return { leaf: pick("leaf"), leafDark: pick("leafDark"), stem: pick("stem") };
}
