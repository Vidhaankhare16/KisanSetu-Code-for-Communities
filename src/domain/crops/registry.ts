/**
 * Model registry: publishes each crop's parameters as a versioned model card. States can
 * fetch the national model, calibrate it against their own trial data and share it back in
 * the same format — the "shared agricultural data models" of the AgriN vision.
 */
import type { ModelCard } from "@/contracts/cropModel";
import { CROPS } from "./catalog";

export const NATIONAL_MODEL_VERSION = "2026.10-national";
const UPDATED_AT = "2026-09-30";

const SOURCES = [
  "FAO Irrigation and Drainage Paper 56 (crop coefficients, stage lengths, rooting depth, depletion fraction)",
  "FAO Irrigation and Drainage Paper 33 (yield response to water)",
  "CACP / CCEA MSP notifications: Kharif Marketing Season 2026-27 and Rabi Marketing Season 2027-28",
  "ICAR crop production guides (cardinal temperatures, sowing windows, pest thresholds)",
];

export function modelCards(): ModelCard[] {
  return CROPS.map((crop) => ({
    id: `${crop.id}@${NATIONAL_MODEL_VERSION}`,
    version: NATIONAL_MODEL_VERSION,
    scope: "national",
    parameters: crop,
    sources: SOURCES,
    updatedAt: UPDATED_AT,
  }));
}
