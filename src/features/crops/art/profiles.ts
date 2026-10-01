/**
 * How each crop looks: its plant form and the colours of its flowers and produce.
 * Shared by the season simulator scene and the small crop icons used across the app.
 */

export type PlantForm = "grass" | "brassica" | "sunflower" | "legume" | "sesame" | "cotton" | "potato" | "onion" | "tomato";

/** Inflorescence of grass-family crops. */
export type GrassHead = "awned" | "awnedLong" | "drooping" | "candle" | "compact" | "fingers" | "maize";

export interface CropArt {
  form: PlantForm;
  head?: GrassHead;
  /** Flower colour (or the head colour while green, for grasses). */
  flower: string;
  /** Unripe produce colour. */
  fruit: string;
  /** Ripe produce colour. */
  ripe: string;
  /** Taller, more upright growth habit (pigeon pea). */
  upright?: boolean;
  /** Produce that forms below ground and is drawn in the soil profile. */
  underground?: "pods" | "tubers";
}

const ART: Record<string, CropArt> = {
  rice: { form: "grass", head: "drooping", flower: "#a9c46a", fruit: "#b8c96a", ripe: "#d9b453" },
  wheat: { form: "grass", head: "awned", flower: "#9cc25a", fruit: "#a7c75c", ripe: "#e0b04a" },
  barley: { form: "grass", head: "awnedLong", flower: "#a4c562", fruit: "#b0c868", ripe: "#e3bd62" },
  maize: { form: "grass", head: "maize", flower: "#d8c47a", fruit: "#9cbf5f", ripe: "#f2c230" },
  bajra: { form: "grass", head: "candle", flower: "#93b35a", fruit: "#a9b86a", ripe: "#b7a37a" },
  jowar: { form: "grass", head: "compact", flower: "#a0bd60", fruit: "#b5c46b", ripe: "#a8552f" },
  ragi: { form: "grass", head: "fingers", flower: "#8fb158", fruit: "#9bb25e", ripe: "#8a5a36" },
  chickpea: { form: "legume", flower: "#c46aa3", fruit: "#9fbf5a", ripe: "#c8a76a" },
  lentil: { form: "legume", flower: "#b9b6e6", fruit: "#a6c565", ripe: "#c5a46c" },
  pigeonpea: { form: "legume", flower: "#f0b323", fruit: "#7f9f45", ripe: "#9a6a3c", upright: true },
  moong: { form: "legume", flower: "#f2cf35", fruit: "#5f8f3a", ripe: "#4a3a2a" },
  urad: { form: "legume", flower: "#e9c62e", fruit: "#5b7d3a", ripe: "#2f2a24" },
  groundnut: { form: "legume", flower: "#f4b400", fruit: "#c9a26b", ripe: "#c9a26b", underground: "pods" },
  soybean: { form: "legume", flower: "#9a6fc4", fruit: "#8fae55", ripe: "#b08a52" },
  mustard: { form: "brassica", flower: "#f2c400", fruit: "#9cb956", ripe: "#b89b5e" },
  sunflower: { form: "sunflower", flower: "#f6b400", fruit: "#6b4423", ripe: "#5a3a1e" },
  sesame: { form: "sesame", flower: "#f3dfe8", fruit: "#8fae55", ripe: "#9a7a4e" },
  cotton: { form: "cotton", flower: "#f7efc2", fruit: "#8fae55", ripe: "#fbfaf4" },
  potato: { form: "potato", flower: "#ece6f5", fruit: "#c9a26b", ripe: "#c9a26b", underground: "tubers" },
  onion: { form: "onion", flower: "#e8e2f0", fruit: "#b5523b", ripe: "#a8573a" },
  tomato: { form: "tomato", flower: "#f5d020", fruit: "#7fae4a", ripe: "#d63a2a" },
};

const BY_CATEGORY: Record<string, CropArt> = {
  cereal: ART.wheat!,
  millet: ART.bajra!,
  pulse: ART.chickpea!,
  oilseed: ART.mustard!,
  vegetable: ART.tomato!,
  cash: ART.cotton!,
  fodder: ART.jowar!,
};

export function cropArt(cropId: string, category?: string): CropArt {
  return ART[cropId] ?? BY_CATEGORY[category ?? "cereal"] ?? ART.wheat!;
}
