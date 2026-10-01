import { describe, expect, it } from "vitest";
import { LANGS } from "@/contracts/farm";
import { inr, inrShort, longDate, pct, shortDate } from "./format";
import { MONTHS } from "./months";

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
    expect(longDate("2026-01-05")).toBe("5 January 2026");
  });

  it("puts the day first in every language, so server and browser render the same text", () => {
    expect(shortDate("2026-10-25", "ta")).toBe("25 அக்.");
    expect(shortDate("2026-10-25", "pa")).toBe("25 ਅਕਤੂ");
    expect(longDate("2026-02-20", "hi")).toBe("20 फ़रवरी 2026");
  });

  it("has twelve short and long month names for every UI language", () => {
    for (const lang of LANGS) {
      expect(MONTHS[lang].short, lang).toHaveLength(12);
      expect(MONTHS[lang].long, lang).toHaveLength(12);
    }
  });
});
