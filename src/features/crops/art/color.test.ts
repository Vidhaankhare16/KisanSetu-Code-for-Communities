import { describe, expect, it } from "vitest";
import { mix, plantTint, seeded } from "./color";
import { cropArt } from "./profiles";
import { CROPS } from "@/domain/crops/catalog";

describe("crop art helpers", () => {
  it("mixes colours linearly", () => {
    expect(mix("#000000", "#ffffff", 0.5)).toBe("#808080");
    expect(mix("#102030", "#102030", 0.7)).toBe("#102030");
    expect(mix("#000000", "#ffffff", 2)).toBe("#ffffff");
  });

  it("produces repeatable random sequences", () => {
    const a = seeded(42);
    const b = seeded(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("turns foliage from green towards straw as the crop ripens and olive when stressed", () => {
    const green = plantTint(100, 0, "mid", 0.5);
    const stressed = plantTint(40, 0.8, "mid", 0.5);
    const ripe = plantTint(100, 0, "late", 1);
    expect(green.leaf).not.toBe(stressed.leaf);
    expect(ripe.leaf).not.toBe(green.leaf);
  });

  it("has artwork for every crop in the catalogue", () => {
    for (const crop of CROPS) expect(cropArt(crop.id, crop.category).form).toBeDefined();
  });
});
