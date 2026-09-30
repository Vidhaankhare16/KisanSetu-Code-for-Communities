import { describe, expect, it } from "vitest";
import { EligibilityProfileSchema } from "@/contracts/api";
import { evaluateSchemes } from "./catalog";

const profile = (o: Record<string, unknown> = {}) => EligibilityProfileSchema.parse({ landAcres: 2, ...o });
const byId = (p: ReturnType<typeof profile>) => Object.fromEntries(evaluateSchemes(p).map((m) => [m.scheme.id, m.result]));

describe("scheme eligibility", () => {
  it("lists eligible schemes first and always gives a reason", () => {
    const matches = evaluateSchemes(profile());
    const firstIneligible = matches.findIndex((m) => !m.result.eligible);
    expect(matches.slice(firstIneligible).every((m) => !m.result.eligible)).toBe(true);
    expect(matches.every((m) => m.result.reason.length > 5)).toBe(true);
  });

  it("excludes landless tenants from PM-KISAN but keeps crop insurance and KCC", () => {
    const r = byId(profile({ ownsLand: false, isTenant: true }));
    expect(r["pm-kisan"]!.eligible).toBe(false);
    expect(r["pmfby"]!.eligible).toBe(true);
    expect(r["kcc"]!.eligible).toBe(true);
  });

  it("excludes income-tax payers from PM-KISAN", () => {
    expect(byId(profile({ isIncomeTaxPayer: true }))["pm-kisan"]!.eligible).toBe(false);
  });

  it("applies the 2-hectare and entry-age limits of PM-KMY", () => {
    expect(byId(profile({ landAcres: 8 }))["pm-kmy"]!.eligible).toBe(false);
    expect(byId(profile({ age: 55 }))["pm-kmy"]!.eligible).toBe(false);
    expect(byId(profile({ age: 30 }))["pm-kmy"]!.eligible).toBe(true);
  });

  it("requires FPO membership inside a cluster for NMEO-Oilseeds", () => {
    expect(byId(profile({ inOilseedCluster: true }))["nmeo-oilseeds"]!.eligible).toBe(false);
    expect(byId(profile({ inOilseedCluster: true, isFpoMember: true }))["nmeo-oilseeds"]!.eligible).toBe(true);
  });
});
