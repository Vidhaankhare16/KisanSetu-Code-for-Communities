import { describe, expect, it } from "vitest";
import { extraterrestrialRadiation, hargreavesEt0, penmanMonteithEt0, saturationVapourPressure } from "./et0";

describe("FAO-56 reference evapotranspiration", () => {
  it("computes saturation vapour pressure (FAO-56 Annex 2 table)", () => {
    expect(saturationVapourPressure(20)).toBeCloseTo(2.338, 3);
    expect(saturationVapourPressure(35)).toBeCloseTo(5.623, 3);
  });

  it("matches FAO-56 Example 8 for extraterrestrial radiation", () => {
    // 20°S on 3 September (J = 246): Ra = 32.2 MJ m-2 day-1.
    expect(extraterrestrialRadiation(-20, 246)).toBeCloseTo(32.2, 1);
  });

  it("matches FAO-56 Example 18 for Penman-Monteith ET0", () => {
    // Brussels, 6 July: published ET0 = 3.9 mm/day.
    const et0 = penmanMonteithEt0({
      tMax: 21.5,
      tMin: 12.3,
      ea: 1.409,
      u2: 2.078,
      rs: 22.07,
      latDeg: 50.8,
      elevationM: 100,
      dayOfYear: 187,
    });
    expect(et0).toBeCloseTo(3.9, 1);
  });

  it("gives plausible Hargreaves values for a hot Indian pre-monsoon day", () => {
    const et0 = hargreavesEt0(42, 27, 26.9, 140);
    expect(et0).toBeGreaterThan(6);
    expect(et0).toBeLessThan(10);
  });

  it("never returns negative evapotranspiration", () => {
    expect(penmanMonteithEt0({ tMax: 2, tMin: -5, rhMean: 95, u2: 0.5, rs: 2, latDeg: 34, elevationM: 1600, dayOfYear: 10 })).toBeGreaterThanOrEqual(0);
  });
});
