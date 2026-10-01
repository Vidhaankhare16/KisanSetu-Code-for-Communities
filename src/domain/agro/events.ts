/** Turns a simulated season into the farmer-facing event timeline. */
import type { WaterAccess, SoilCard } from "@/contracts/farm";
import type { SimEvent, Severity } from "@/contracts/simulation";
import type { CropModel } from "@/domain/crops/types";
import { formatShortDate } from "@/domain/time";
import type { SeasonRun } from "./engine";
import { isRiskFavourable } from "./risks";
import type { DailyWeather } from "./weather";

/** IMD rainfall categories (mm/day). */
const HEAVY_RAIN_MM = 64.5;
const VERY_HEAVY_RAIN_MM = 115.6;
const RISK_COOLDOWN_DAYS = 21;
/** Available soil nitrogen below this is rated "low" on a Soil Health Card (kg/ha). */
const LOW_SOIL_N = 280;

export interface EventContext {
  crop: CropModel;
  run: SeasonRun;
  weather: readonly DailyWeather[];
  water: WaterAccess;
  soilCard?: SoilCard;
}

export function buildEvents({ crop, run, weather, water, soilCard }: EventContext): SimEvent[] {
  const events: SimEvent[] = [];
  const { days } = run;
  if (days.length === 0) return events;

  const push = (day: number, type: SimEvent["type"], severity: Severity, title: string, detail: string, action?: string) =>
    events.push({ day, date: days[day]!.date, type, severity, title, detail, ...(action ? { action } : {}) });

  push(
    0,
    "sowing",
    "info",
    `Sowing ${crop.name}`,
    `${crop.stageNotes[0]} Expected harvest around ${formatShortDate(days.at(-1)!.date)}.`,
    crop.nitrogenFixing
      ? "Treat seed with Rhizobium and PSB culture; apply the full phosphorus dose at sowing."
      : "Apply the basal dose (full P and K, one-third of N) at sowing.",
  );

  for (const stage of run.stages.slice(1)) {
    push(stage.startDay, "stage_change", "info", stage.label, stage.description);
  }

  // Nitrogen top-dressing at the start of vegetative growth for non-legumes.
  const development = run.stages.find((s) => s.key === "development");
  if (development && !crop.nitrogenFixing) {
    const lowN = soilCard ? soilCard.nitrogen < LOW_SOIL_N : false;
    push(
      development.startDay,
      "fertilizer",
      "info",
      "Nitrogen top-dressing",
      lowN
        ? `Your soil card shows low available nitrogen (${soilCard!.nitrogen} kg/ha), so the full recommended dose is needed.`
        : "The crop's nitrogen demand rises sharply as it starts rapid growth.",
      water === "rainfed"
        ? "Top-dress urea only when the soil is moist, just before or after rain."
        : "Top-dress urea just before an irrigation so it moves into the root zone.",
    );
  }

  days.forEach((d) => {
    if (d.irrigationMm <= 0) return;
    const pre = d.day === 0;
    push(
      d.day,
      "irrigation",
      "info",
      pre ? "Pre-sowing irrigation (palewa)" : `Irrigation — about ${Math.round(d.irrigationMm)} mm`,
      pre
        ? "The seedbed is too dry for good germination, so it is brought to field capacity first."
        : `Root-zone moisture fell to ${Math.round(days[Math.max(0, d.day - 1)]!.soilMoisturePct)}% of available water, the point where this crop starts to suffer.`,
      `Apply about ${Math.round(d.irrigationMm)} mm of water.`,
    );
  });

  for (const spell of run.drySpells) {
    const length = spell.endDay - spell.startDay + 1;
    const inMid = days.slice(spell.startDay, spell.endDay + 1).some((d) => d.stage === "mid");
    push(
      spell.startDay,
      "dry_spell",
      inMid || length >= 14 ? "critical" : "warning",
      `Dry spell — ${length} days of moisture stress`,
      `Soil water stays below the crop's stress threshold from ${formatShortDate(days[spell.startDay]!.date)} to ${formatShortDate(days[spell.endDay]!.date)}${inMid ? ", overlapping flowering" : ""}.`,
      water === "rainfed"
        ? "Mulch with crop residue, hoe to break the soil crust, and spray 2% urea or 1% KNO3 to help the crop hold on."
        : "Irrigate now; with limited water, save it for flowering and grain filling.",
    );
  }

  days.forEach((d) => {
    if (d.rainMm >= HEAVY_RAIN_MM) {
      push(
        d.day,
        "heavy_rain",
        d.rainMm >= VERY_HEAVY_RAIN_MM ? "critical" : "warning",
        `Heavy rain — ${Math.round(d.rainMm)} mm`,
        "Waterlogging for more than a day damages roots and washes away fertiliser.",
        "Open field drains and postpone fertiliser and pesticide sprays until the soil drains.",
      );
    }
  });

  addStreakEvents(
    days,
    (d) => d.tMaxC > crop.heatStressC && (d.stage === "mid" || d.stage === "late"),
    (start, peakDay) =>
      push(
        start,
        "heat_stress",
        peakDay.tMaxC - crop.heatStressC >= 3 ? "critical" : "warning",
        `Heat stress — up to ${Math.round(peakDay.tMaxC)}°C`,
        `Temperatures above ${crop.heatStressC}°C during ${days[start]!.stage === "mid" ? "flowering" : "grain filling"} reduce ${crop.category === "vegetable" ? "fruit set" : "grain weight"}.`,
        water === "rainfed" ? "Spray 0.5% KNO3 in the evening to reduce heat damage." : "Give a light evening irrigation to cool the canopy.",
      ),
    (d) => d.tMaxC,
  );

  addStreakEvents(
    days,
    (d) => d.tMinC < crop.coldStressC && (d.stage === "development" || d.stage === "mid"),
    (start, coldestDay) =>
      push(
        start,
        "cold_stress",
        crop.coldStressC - coldestDay.tMinC >= 3 ? "critical" : "warning",
        `Cold / frost risk — down to ${Math.round(coldestDay.tMinC)}°C`,
        `Night temperatures below ${crop.coldStressC}°C can injure ${crop.name.toLowerCase()} flowers and pods.`,
        "Irrigate lightly in the evening before cold nights; moist soil holds heat and protects the crop.",
      ),
    (d) => -d.tMinC,
  );

  const lastFired = new Map<string, number>();
  days.forEach((d, i) => {
    for (const r of crop.risks) {
      if (!r.stages.includes(d.stage)) continue;
      const last = lastFired.get(r.name);
      if (last !== undefined && i - last < RISK_COOLDOWN_DAYS) continue;
      if (!isRiskFavourable(r.rule, weather, i)) continue;
      lastFired.set(r.name, i);
      push(
        i,
        r.kind === "pest" ? "pest_risk" : "disease_risk",
        "warning",
        `${r.name} risk`,
        `Recent weather favours ${r.name.toLowerCase()} at this stage.`,
        r.action,
      );
    }
  });

  const last = days.at(-1)!;
  push(
    last.day,
    "harvest",
    run.matured ? "info" : "critical",
    run.matured ? `Harvest ${crop.name}` : "Crop does not mature in time",
    run.matured
      ? `Expected yield about ${(run.expectedYieldKgHa / 100 / 2.471).toFixed(1)} quintal per acre.`
      : "Temperatures after this sowing date are outside the crop's range, so it cannot complete its cycle.",
    run.matured ? "Harvest at physiological maturity and dry the produce before storage." : "Choose another crop or sowing date.",
  );

  return events.sort((a, b) => a.day - b.day || order(a.type) - order(b.type));
}

type Day = SeasonRun["days"][number];

/**
 * Emits one event per streak of consecutive days that satisfy `predicate`, passing the
 * streak's first day and the most extreme day in it (highest `score`).
 */
function addStreakEvents(
  days: SeasonRun["days"],
  predicate: (d: Day) => boolean,
  emit: (startDay: number, extremeDay: Day) => void,
  score: (d: Day) => number,
) {
  let start = -1;
  let extreme: Day | undefined;
  days.forEach((d, i) => {
    const hit = predicate(d);
    if (hit) {
      if (start < 0) start = i;
      if (!extreme || score(d) > score(extreme)) extreme = d;
    }
    if ((!hit || i === days.length - 1) && start >= 0 && extreme) {
      emit(start, extreme);
      start = -1;
      extreme = undefined;
    }
  });
}

const TYPE_ORDER: SimEvent["type"][] = [
  "sowing",
  "stage_change",
  "fertilizer",
  "irrigation",
  "heavy_rain",
  "dry_spell",
  "heat_stress",
  "cold_stress",
  "pest_risk",
  "disease_risk",
  "harvest",
];
const order = (t: SimEvent["type"]) => TYPE_ORDER.indexOf(t);
