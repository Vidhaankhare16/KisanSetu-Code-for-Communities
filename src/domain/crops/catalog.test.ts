import { describe, expect, it } from "vitest";
import { CropModelSchema, ModelCardSchema } from "@/contracts/cropModel";
import { CROPS } from "./catalog";
import { modelCards } from "./registry";

describe("crop catalogue", () => {
  it.each(CROPS.map((c) => [c.id, c] as const))("%s satisfies the published model schema", (_id, crop) => {
    const result = CropModelSchema.safeParse(crop);
    expect(result.success ? "ok" : result.error.issues).toBe("ok");
  });

  it("has unique ids", () => {
    expect(new Set(CROPS.map((c) => c.id)).size).toBe(CROPS.length);
  });

  it("publishes a valid, versioned model card for every crop", () => {
    const cards = modelCards();
    expect(cards).toHaveLength(CROPS.length);
    cards.forEach((card) => expect(() => ModelCardSchema.parse(card)).not.toThrow());
  });
});
