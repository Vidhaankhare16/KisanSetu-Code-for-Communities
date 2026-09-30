/**
 * Weather-driven pest and disease pressure. Each rule looks at a trailing window of days
 * and returns true when conditions favour the organism; the crop catalog decides which
 * organisms matter for which crop and stage.
 */
import type { RiskRule } from "@/domain/crops/types";
import type { DailyWeather } from "./weather";

type Window = readonly Pick<DailyWeather, "tMax" | "tMin" | "rain" | "rhMean">[];

const wetDays = (win: Window, rainMm: number) =>
  win.filter((d) => d.rain >= rainMm || (d.rhMean ?? 0) >= 80).length;
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);

const RULES: Record<RiskRule, { windowDays: number; test: (win: Window) => boolean }> = {
  cool_humid: {
    windowDays: 3,
    test: (win) => {
      const tMax = mean(win.map((d) => d.tMax));
      return tMax >= 12 && tMax <= 25 && wetDays(win, 1) >= 2;
    },
  },
  warm_humid: {
    windowDays: 3,
    test: (win) => {
      const tMax = mean(win.map((d) => d.tMax));
      return tMax > 25 && tMax <= 34 && wetDays(win, 2) >= 2;
    },
  },
  cool_dry: {
    windowDays: 5,
    test: (win) =>
      win.every((d) => d.tMax >= 15 && d.tMax <= 26 && d.tMin >= 4 && d.tMin <= 15 && d.rain < 1),
  },
  warm_flowering: {
    windowDays: 3,
    test: (win) => {
      const tMax = mean(win.map((d) => d.tMax));
      return tMax >= 25 && tMax <= 34;
    },
  },
  hot_dry: {
    windowDays: 5,
    test: (win) => win.every((d) => d.tMax >= 32) && win.reduce((a, d) => a + d.rain, 0) < 2,
  },
};

/** True when the `windowDays` ending at `index` (inclusive) favour the given rule. */
export function isRiskFavourable(rule: RiskRule, weather: Window, index: number): boolean {
  const { windowDays, test } = RULES[rule];
  if (index + 1 < windowDays) return false;
  return test(weather.slice(index + 1 - windowDays, index + 1));
}
