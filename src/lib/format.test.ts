import { describe, expect, it } from "vitest";
import { inr, inrShort, pct, shortDate } from "./format";

describe("Indian number and date formatting", () => {
  it("groups rupees in lakhs", () => {
    expect(inr(123456)).toBe("₹1,23,456");
    expect(inr(-5000.4)).toBe("−₹5,000");
  });

  it("abbreviates for charts", () => {
    expect(inrShort(38173)).toBe("₹38k");
    expect(inrShort(250000)).toBe("₹2.5L");
    expect(inrShort(-900)).toBe("−₹900");
  });

  it("formats percentages and dates", () => {
    expect(pct(0.456)).toBe("46%");
    expect(shortDate("2026-10-20")).toBe("20 Oct");
  });
});
