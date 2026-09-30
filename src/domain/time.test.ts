import { describe, expect, it } from "vitest";
import { addDays, dayOfYear, daysBetween, distanceToWindow, withYear } from "./time";

describe("calendar helpers", () => {
  it("adds days across month and year boundaries", () => {
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
    expect(daysBetween("2026-10-01", "2027-03-01")).toBe(151);
  });

  it("computes day of year", () => {
    expect(dayOfYear("2026-01-01")).toBe(1);
    expect(dayOfYear("2024-12-31")).toBe(366);
  });

  it("maps 29 February to 28 February in non-leap years", () => {
    expect(withYear("2024-02-29", 2025)).toBe("2025-02-28");
    expect(withYear("2026-10-20", 2019)).toBe("2019-10-20");
  });

  it("measures distance to a sowing window, including windows that wrap the year", () => {
    const window = { from: { month: 10, day: 25 }, to: { month: 12, day: 20 } };
    expect(distanceToWindow("2026-11-15", window.from, window.to)).toBe(0);
    expect(distanceToWindow("2026-10-15", window.from, window.to)).toBe(10);
    const wrap = { from: { month: 12, day: 15 }, to: { month: 1, day: 31 } };
    expect(distanceToWindow("2027-01-10", wrap.from, wrap.to)).toBe(0);
    expect(distanceToWindow("2026-12-01", wrap.from, wrap.to)).toBe(14);
  });
});
