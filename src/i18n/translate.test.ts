import { describe, expect, it } from "vitest";
import { en } from "./messages/en";
import { createTranslator, withFallback } from "./translate";

describe("translator", () => {
  it("resolves nested keys and interpolates variables", () => {
    const t = createTranslator(en);
    expect(t("nav.plan")).toBe("Plan my crop");
    expect(t("sim.day", { day: 12, total: 120 })).toBe("Day 12 of 120");
  });

  it("falls back to English for missing or empty translations", () => {
    const hi = withFallback({ nav: { plan: "मेरी फसल की योजना", doctor: "" } });
    const t = createTranslator(hi);
    expect(t("nav.plan")).toBe("मेरी फसल की योजना");
    expect(t("nav.doctor")).toBe("Crop doctor");
    expect(t("landing.cta")).toBe(en.landing.cta);
  });

  it("leaves unknown placeholders untouched", () => {
    const t = createTranslator(en);
    expect(t("plan.harvestBy")).toBe("Harvest around {date}");
  });
});
