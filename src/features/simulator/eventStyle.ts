import {
  Bug,
  CloudLightning,
  Droplets,
  Flag,
  FlaskConical,
  Microscope,
  Snowflake,
  Sprout,
  Sun,
  Wheat,
  type LucideIcon,
} from "lucide-react";
import type { EventType, Severity } from "@/contracts/simulation";
import type { Tone } from "@/components/ui/Tone";

export const EVENT_ICON: Record<EventType, LucideIcon> = {
  sowing: Sprout,
  stage_change: Flag,
  irrigation: Droplets,
  fertilizer: FlaskConical,
  dry_spell: Sun,
  heavy_rain: CloudLightning,
  heat_stress: Sun,
  cold_stress: Snowflake,
  pest_risk: Bug,
  disease_risk: Microscope,
  harvest: Wheat,
};

/** Colour follows the quantity involved, severity only escalates to the alert hue. */
export function eventTone(type: EventType, severity: Severity): Tone {
  if (severity === "critical") return "alert";
  switch (type) {
    case "irrigation":
    case "heavy_rain":
      return "water";
    case "dry_spell":
    case "heat_stress":
    case "harvest":
      return "sun";
    case "fertilizer":
      return "soil";
    case "pest_risk":
    case "disease_risk":
      return "alert";
    case "cold_stress":
      return "water";
    default:
      return "leaf";
  }
}
