/**
 * States and union territories with their dominant agricultural soil texture — the last
 * fallback when neither a Soil Health Card nor SoilGrids data is available.
 * Based on the ICAR-NBSS&LUP soil resource maps (broad dominant classes).
 */
import type { SoilTexture } from "@/contracts/farm";

export interface StateInfo {
  code: string;
  name: string;
  dominantTexture: SoilTexture;
  soilNote: string;
}

export const STATES: readonly StateInfo[] = [
  {
    code: "AP",
    name: "Andhra Pradesh",
    dominantTexture: "sandy_clay_loam",
    soilNote: "Red loams inland, black soils in the west, deltaic alluvium on the coast",
  },
  { code: "AR", name: "Arunachal Pradesh", dominantTexture: "loam", soilNote: "Forest and hill soils" },
  { code: "AS", name: "Assam", dominantTexture: "silt_loam", soilNote: "Brahmaputra alluvium" },
  { code: "BR", name: "Bihar", dominantTexture: "silt_loam", soilNote: "Gangetic alluvium" },
  { code: "CG", name: "Chhattisgarh", dominantTexture: "sandy_clay_loam", soilNote: "Red and yellow soils" },
  { code: "GA", name: "Goa", dominantTexture: "sandy_clay_loam", soilNote: "Laterite soils" },
  { code: "GJ", name: "Gujarat", dominantTexture: "clay_loam", soilNote: "Black soils in Saurashtra, sandy loams in the north" },
  { code: "HR", name: "Haryana", dominantTexture: "sandy_loam", soilNote: "Alluvial sandy loams" },
  { code: "HP", name: "Himachal Pradesh", dominantTexture: "loam", soilNote: "Mountain and valley soils" },
  { code: "JH", name: "Jharkhand", dominantTexture: "sandy_clay_loam", soilNote: "Red and laterite soils of the Chota Nagpur plateau" },
  { code: "KA", name: "Karnataka", dominantTexture: "sandy_clay_loam", soilNote: "Red soils in the south, black soils in the north" },
  { code: "KL", name: "Kerala", dominantTexture: "sandy_clay_loam", soilNote: "Laterite soils" },
  { code: "MP", name: "Madhya Pradesh", dominantTexture: "clay", soilNote: "Deep black (vertisol) soils of the Malwa plateau" },
  { code: "MH", name: "Maharashtra", dominantTexture: "clay", soilNote: "Black cotton soils of the Deccan" },
  { code: "MN", name: "Manipur", dominantTexture: "clay_loam", soilNote: "Valley and hill soils" },
  { code: "ML", name: "Meghalaya", dominantTexture: "loam", soilNote: "Acidic hill soils" },
  { code: "MZ", name: "Mizoram", dominantTexture: "loam", soilNote: "Acidic hill soils" },
  { code: "NL", name: "Nagaland", dominantTexture: "loam", soilNote: "Acidic hill soils" },
  { code: "OD", name: "Odisha", dominantTexture: "sandy_clay_loam", soilNote: "Red and laterite uplands, deltaic alluvium on the coast" },
  { code: "PB", name: "Punjab", dominantTexture: "loam", soilNote: "Indo-Gangetic alluvium" },
  { code: "RJ", name: "Rajasthan", dominantTexture: "loamy_sand", soilNote: "Desert and sandy soils in the west, alluvium in the east" },
  { code: "SK", name: "Sikkim", dominantTexture: "loam", soilNote: "Mountain soils" },
  { code: "TN", name: "Tamil Nadu", dominantTexture: "sandy_clay_loam", soilNote: "Red loams, black soils and coastal alluvium" },
  { code: "TS", name: "Telangana", dominantTexture: "sandy_clay_loam", soilNote: "Red chalka soils and black soils" },
  { code: "TR", name: "Tripura", dominantTexture: "loam", soilNote: "Red loams and valley alluvium" },
  { code: "UP", name: "Uttar Pradesh", dominantTexture: "silt_loam", soilNote: "Gangetic alluvium" },
  { code: "UK", name: "Uttarakhand", dominantTexture: "loam", soilNote: "Mountain soils and Tarai alluvium" },
  { code: "WB", name: "West Bengal", dominantTexture: "silt_loam", soilNote: "Gangetic delta alluvium" },
  { code: "AN", name: "Andaman and Nicobar Islands", dominantTexture: "loam", soilNote: "Forest soils" },
  { code: "CH", name: "Chandigarh", dominantTexture: "loam", soilNote: "Alluvium" },
  { code: "DN", name: "Dadra and Nagar Haveli and Daman and Diu", dominantTexture: "clay_loam", soilNote: "Black and coastal soils" },
  { code: "DL", name: "Delhi", dominantTexture: "sandy_loam", soilNote: "Alluvium" },
  { code: "JK", name: "Jammu and Kashmir", dominantTexture: "loam", soilNote: "Karewa and valley soils" },
  { code: "LA", name: "Ladakh", dominantTexture: "sandy_loam", soilNote: "Cold desert soils" },
  { code: "LD", name: "Lakshadweep", dominantTexture: "sand", soilNote: "Coral sands" },
  { code: "PY", name: "Puducherry", dominantTexture: "sandy_clay_loam", soilNote: "Coastal alluvium and red soils" },
];

export function findState(name: string | undefined): StateInfo | undefined {
  if (!name) return undefined;
  const n = normalise(name);
  return STATES.find((s) => normalise(s.name) === n || s.code.toLowerCase() === n);
}

const normalise = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z]/g, "");
