import { describe, expect, it } from "vitest";
import { availableWaterPerMetre, classifyTexture } from "./soil";

describe("USDA texture classification", () => {
  it.each([
    [92, 3, "sand"],
    [82, 6, "loamy_sand"],
    [65, 10, "sandy_loam"],
    [40, 20, "loam"],
    [20, 15, "silt_loam"],
    [5, 5, "silt"],
    [60, 25, "sandy_clay_loam"],
    [30, 33, "clay_loam"],
    [10, 33, "silty_clay_loam"],
    [50, 42, "sandy_clay"],
    [5, 45, "silty_clay"],
    [20, 55, "clay"],
  ] as const)("sand %i%% / clay %i%% is %s", (sand, clay, expected) => {
    expect(classifyTexture(sand, clay)).toBe(expected);
  });

  it("clamps out-of-range fractions instead of throwing", () => {
    expect(classifyTexture(120, 10)).toBe("sand");
  });
});

describe("available water capacity", () => {
  it("is higher in loams and clays than in sands", () => {
    expect(availableWaterPerMetre("sand")).toBeLessThan(availableWaterPerMetre("loam"));
    expect(availableWaterPerMetre("clay")).toBeGreaterThan(availableWaterPerMetre("sandy_loam"));
  });
});
