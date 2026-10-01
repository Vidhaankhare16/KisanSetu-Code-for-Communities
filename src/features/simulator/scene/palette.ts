/** Daylight colours for the field scene, driven by the simulated day's weather. */
import { mix } from "@/features/crops/art/color";

export interface SkyPalette {
  top: string;
  horizon: string;
  sun: string;
  sunGlow: string;
  hills: string;
  treeLine: string;
  haze: number;
}

/**
 * Clear blue on mild days, a pale dusty haze in the heat, grey under rain, and a warm
 * golden horizon as the crop ripens towards harvest.
 */
export function skyPalette(tMax: number, rainMm: number, ripening: number): SkyPalette {
  const heat = clamp01((tMax - 30) / 12);
  const cool = clamp01((22 - tMax) / 12);
  const overcast = clamp01(rainMm / 15);
  let top = mix(mix("#7fb7e0", "#a9c4d6", heat), "#93aecb", cool * 0.5);
  let horizon = mix(mix("#e3f0f6", "#f3e4c6", heat), "#e6edf2", cool * 0.5);
  top = mix(top, "#8e9aa5", overcast);
  horizon = mix(horizon, "#c8d0d6", overcast);
  horizon = mix(horizon, "#f6dca2", ripening * 0.45 * (1 - overcast));
  return {
    top,
    horizon,
    sun: mix("#fff6d2", "#ffe08a", heat),
    sunGlow: mix("#fff3c4", "#ffd36b", heat),
    hills: mix("#9db8a8", "#b5b8a0", heat),
    treeLine: mix("#5e8a5a", "#7a8a52", heat),
    haze: 0.15 + heat * 0.35 + overcast * 0.3,
  };
}

/** Soil colour darkens as it gets wetter (root-zone plant-available water, %). */
export function soilColors(moisturePct: number): { surface: string; topsoil: string; subsoil: string; wet: string } {
  const wet = clamp01(moisturePct / 100);
  return {
    surface: mix("#c39b6c", "#7d5636", wet),
    topsoil: mix("#a87b52", "#5e3d24", wet),
    subsoil: mix("#b88f63", "#7a5434", wet * 0.7),
    wet: mix("#6b4a2e", "#3f2a18", wet),
  };
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}
