/**
 * Reference evapotranspiration (ET0) following FAO Irrigation & Drainage Paper 56.
 * All equation numbers refer to that paper.
 */

const SOLAR_CONSTANT = 0.082; // MJ m-2 min-1
const STEFAN_BOLTZMANN = 4.903e-9; // MJ K-4 m-2 day-1

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Saturation vapour pressure at temperature T (kPa), eq. 11. */
export function saturationVapourPressure(tC: number): number {
  return 0.6108 * Math.exp((17.27 * tC) / (tC + 237.3));
}

/** Extraterrestrial radiation Ra (MJ m-2 day-1), eq. 21. */
export function extraterrestrialRadiation(latDeg: number, dayOfYear: number): number {
  const phi = toRad(latDeg);
  const dr = 1 + 0.033 * Math.cos(((2 * Math.PI) / 365) * dayOfYear); // eq. 23
  const delta = 0.409 * Math.sin(((2 * Math.PI) / 365) * dayOfYear - 1.39); // eq. 24
  const ws = Math.acos(Math.max(-1, Math.min(1, -Math.tan(phi) * Math.tan(delta)))); // eq. 25
  return (
    ((24 * 60) / Math.PI) *
    SOLAR_CONSTANT *
    dr *
    (ws * Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.sin(ws))
  );
}

export interface PenmanMonteithInput {
  tMax: number;
  tMin: number;
  /** Mean relative humidity (%), used when `ea` is not supplied. */
  rhMean?: number;
  /** Actual vapour pressure (kPa); overrides `rhMean`. */
  ea?: number;
  /** Wind speed at 2 m (m/s). */
  u2: number;
  /** Incoming shortwave radiation (MJ m-2 day-1). */
  rs: number;
  latDeg: number;
  elevationM: number;
  dayOfYear: number;
}

/** FAO-56 Penman-Monteith daily ET0 (mm/day), eq. 6. */
export function penmanMonteithEt0(input: PenmanMonteithInput): number {
  const { tMax, tMin, u2, rs, latDeg, elevationM, dayOfYear } = input;
  const tMean = (tMax + tMin) / 2;
  const pressure = 101.3 * Math.pow((293 - 0.0065 * elevationM) / 293, 5.26); // eq. 7
  const gamma = 0.000665 * pressure; // eq. 8
  const delta = (4098 * saturationVapourPressure(tMean)) / Math.pow(tMean + 237.3, 2); // eq. 13
  const es = (saturationVapourPressure(tMax) + saturationVapourPressure(tMin)) / 2; // eq. 12
  const ea = input.ea ?? ((input.rhMean ?? 60) / 100) * es; // eq. 19

  const ra = extraterrestrialRadiation(latDeg, dayOfYear);
  const rso = (0.75 + 2e-5 * elevationM) * ra; // eq. 37
  const rns = (1 - 0.23) * rs; // eq. 38
  const relativeShortwave = Math.min(1, rs / Math.max(rso, 1e-6));
  const rnl =
    STEFAN_BOLTZMANN *
    ((Math.pow(tMax + 273.16, 4) + Math.pow(tMin + 273.16, 4)) / 2) *
    (0.34 - 0.14 * Math.sqrt(Math.max(ea, 0))) *
    (1.35 * relativeShortwave - 0.35); // eq. 39
  const rn = rns - rnl; // eq. 40, soil heat flux G ≈ 0 for daily steps

  const numerator = 0.408 * delta * rn + gamma * (900 / (tMean + 273)) * u2 * (es - ea);
  const denominator = delta + gamma * (1 + 0.34 * u2);
  return Math.max(0, numerator / denominator);
}

/** Hargreaves temperature-only ET0 (mm/day), eq. 52 — fallback when humidity/radiation are missing. */
export function hargreavesEt0(tMax: number, tMin: number, latDeg: number, dayOfYear: number): number {
  const ra = extraterrestrialRadiation(latDeg, dayOfYear);
  const tMean = (tMax + tMin) / 2;
  return Math.max(0, 0.0023 * (tMean + 17.8) * Math.sqrt(Math.max(tMax - tMin, 0)) * 0.408 * ra);
}
