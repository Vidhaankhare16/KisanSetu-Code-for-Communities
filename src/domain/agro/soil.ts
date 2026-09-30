/** Soil hydraulic properties and texture classification. */
import type { SoilTexture } from "@/contracts/farm";

export interface SoilHydraulics {
  /** Volumetric water content at field capacity (m3/m3). */
  fieldCapacity: number;
  /** Volumetric water content at permanent wilting point (m3/m3). */
  wiltingPoint: number;
  /** Volumetric water content at saturation (m3/m3). */
  saturation: number;
}

/**
 * Typical values from FAO-56 Table 19 (mid-points of the published ranges); the three
 * sandy/clay-loam classes absent from that table use Saxton & Rawls (2006) estimates.
 */
const HYDRAULICS: Record<SoilTexture, SoilHydraulics> = {
  sand: { fieldCapacity: 0.12, wiltingPoint: 0.045, saturation: 0.38 },
  loamy_sand: { fieldCapacity: 0.15, wiltingPoint: 0.065, saturation: 0.4 },
  sandy_loam: { fieldCapacity: 0.23, wiltingPoint: 0.11, saturation: 0.41 },
  loam: { fieldCapacity: 0.25, wiltingPoint: 0.12, saturation: 0.43 },
  silt_loam: { fieldCapacity: 0.29, wiltingPoint: 0.15, saturation: 0.45 },
  silt: { fieldCapacity: 0.32, wiltingPoint: 0.17, saturation: 0.46 },
  sandy_clay_loam: { fieldCapacity: 0.27, wiltingPoint: 0.17, saturation: 0.43 },
  clay_loam: { fieldCapacity: 0.32, wiltingPoint: 0.2, saturation: 0.46 },
  silty_clay_loam: { fieldCapacity: 0.335, wiltingPoint: 0.205, saturation: 0.48 },
  sandy_clay: { fieldCapacity: 0.3, wiltingPoint: 0.21, saturation: 0.43 },
  silty_clay: { fieldCapacity: 0.36, wiltingPoint: 0.23, saturation: 0.49 },
  clay: { fieldCapacity: 0.36, wiltingPoint: 0.22, saturation: 0.5 },
};

export function hydraulicsFor(texture: SoilTexture): SoilHydraulics {
  return HYDRAULICS[texture];
}

/** Total available water per metre of root zone (mm/m). */
export function availableWaterPerMetre(texture: SoilTexture): number {
  const h = HYDRAULICS[texture];
  return 1000 * (h.fieldCapacity - h.wiltingPoint);
}

/**
 * USDA soil texture triangle. Inputs are percentages of the mineral fraction.
 * Silt is derived as the remainder so the three always sum to 100.
 */
export function classifyTexture(sandPct: number, clayPct: number): SoilTexture {
  const sand = clamp(sandPct, 0, 100);
  const clay = clamp(clayPct, 0, 100 - sand);
  const silt = 100 - sand - clay;

  if (silt + 1.5 * clay < 15) return "sand";
  if (silt + 1.5 * clay >= 15 && silt + 2 * clay < 30) return "loamy_sand";
  if (clay >= 40 && sand <= 45 && silt < 40) return "clay";
  if (clay >= 40 && silt >= 40) return "silty_clay";
  if (clay >= 35 && sand > 45) return "sandy_clay";
  if (clay >= 27 && clay < 40 && sand > 20 && sand <= 45) return "clay_loam";
  if (clay >= 27 && clay < 40 && sand <= 20) return "silty_clay_loam";
  if (clay >= 20 && clay < 35 && silt < 28 && sand > 45) return "sandy_clay_loam";
  if (silt >= 80 && clay < 12) return "silt";
  if ((silt >= 50 && clay >= 12 && clay < 27) || (silt >= 50 && silt < 80 && clay < 12)) return "silt_loam";
  if (clay >= 7 && clay < 27 && silt >= 28 && silt < 50 && sand <= 52) return "loam";
  return "sandy_loam";
}

/** Human-friendly names used in UI copy and AI prompts. */
export const TEXTURE_LABELS: Record<SoilTexture, string> = {
  sand: "Sand",
  loamy_sand: "Loamy sand",
  sandy_loam: "Sandy loam",
  loam: "Loam",
  silt_loam: "Silt loam",
  silt: "Silt",
  sandy_clay_loam: "Sandy clay loam",
  clay_loam: "Clay loam",
  silty_clay_loam: "Silty clay loam",
  sandy_clay: "Sandy clay",
  silty_clay: "Silty clay",
  clay: "Clay (e.g. black cotton soil)",
};

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}
