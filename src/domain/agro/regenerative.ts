/**
 * Regenerative-agriculture score: how well a crop choice protects soil and water on this
 * field. Every point is explained so the farmer (and an auditor) can see why.
 */
import type { CropModel } from "@/domain/crops/types";
import { getCrop } from "@/domain/crops/catalog";

export interface RegenerativeFactor {
  key: "water" | "nitrogen" | "rotation" | "residue" | "resilience";
  label: string;
  points: number;
  max: number;
  note: string;
}

export interface RegenerativeAssessment {
  score: number;
  factors: RegenerativeFactor[];
}

/** Gross irrigation (mm) at which the water-stewardship score reaches zero. */
const WATER_ZERO_POINTS_MM = 600;

const RESILIENCE: Record<CropModel["category"], number> = {
  millet: 20,
  pulse: 16,
  oilseed: 12,
  fodder: 12,
  cash: 8,
  cereal: 8,
  vegetable: 8,
};

export function assessRegenerative(crop: CropModel, irrigationGrossMm: number, previousCropId?: string): RegenerativeAssessment {
  const waterPoints = Math.round(30 * Math.max(0, 1 - irrigationGrossMm / WATER_ZERO_POINTS_MM));
  const factors: RegenerativeFactor[] = [
    {
      key: "water",
      label: "Water stewardship",
      points: waterPoints,
      max: 30,
      note:
        irrigationGrossMm < 50
          ? "Grows mostly on rain and stored soil moisture."
          : `Needs about ${Math.round(irrigationGrossMm)} mm of pumped irrigation this season.`,
    },
    {
      key: "nitrogen",
      label: "Soil nitrogen",
      points: crop.nitrogenFixing ? 20 : crop.category === "cereal" ? 5 : 8,
      max: 20,
      note: crop.nitrogenFixing
        ? "A legume: fixes 40-80 kg N/ha from the air and leaves some for the next crop."
        : "Depends on applied nitrogen; split doses and neem-coated urea cut losses.",
    },
    rotationFactor(crop, previousCropId),
    {
      key: "residue",
      label: "Residue management",
      points: crop.residueBurningRisk ? 3 : 10,
      max: 10,
      note: crop.residueBurningRisk
        ? "Residue is often burnt in this crop — use a Happy Seeder or in-situ decomposer instead."
        : "Residue is easily incorporated or fed to livestock.",
    },
    {
      key: "resilience",
      label: "Climate resilience",
      points: RESILIENCE[crop.category],
      max: 20,
      note:
        crop.category === "millet"
          ? "Millets tolerate heat and drought and need few inputs."
          : crop.category === "pulse"
            ? "Pulses are hardy and improve soil structure with deep roots."
            : "Moderately sensitive to weather extremes; manage stress stages carefully.",
    },
  ];
  return { score: factors.reduce((a, f) => a + f.points, 0), factors };
}

function rotationFactor(crop: CropModel, previousCropId?: string): RegenerativeFactor {
  const base = { key: "rotation" as const, label: "Crop rotation", max: 20 };
  const previous = previousCropId ? getCrop(previousCropId) : undefined;
  if (!previous) {
    return { ...base, points: 12, note: "Tell us the previous crop to score the rotation." };
  }
  if (previous.id === crop.id) {
    return { ...base, points: 0, note: `Growing ${crop.name} again builds up its pests and drains the same nutrients.` };
  }
  if (crop.nitrogenFixing && !previous.nitrogenFixing) {
    return { ...base, points: 20, note: `A legume after ${previous.name} restores nitrogen and breaks pest cycles.` };
  }
  if (previous.category === crop.category) {
    return { ...base, points: 8, note: `Same crop family as ${previous.name}; a pulse or oilseed would diversify better.` };
  }
  return { ...base, points: 16, note: `A different crop family from ${previous.name} diversifies the rotation.` };
}
