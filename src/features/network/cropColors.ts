/** Crop colours for the outlook map and its legend (shared by server and client components). */
import type { CropCategory } from "@/contracts/simulation";

const CATEGORY_COLOR: Record<CropCategory, string> = {
  cereal: "var(--color-leaf-deep)",
  millet: "var(--color-leaf)",
  pulse: "var(--color-soil)",
  oilseed: "var(--color-sun)",
  cash: "var(--color-water)",
  vegetable: "var(--color-alert)",
  fodder: "var(--color-ink-faint)",
};

/** Distinct shades within each crop family, so the most common winners stay tellable apart. */
const CROP_COLOR: Record<string, string> = {
  mustard: "#d99a0b",
  sunflower: "#c2570c",
  groundnut: "#a16207",
  chickpea: "#8a5a36",
  lentil: "#c08a5a",
  wheat: "#1e7a4c",
  barley: "#0f5534",
  jowar: "#5b8c3a",
};

export function cropColor(cropId: string, category: CropCategory | undefined): string {
  return CROP_COLOR[cropId] ?? CATEGORY_COLOR[category ?? "cereal"];
}
