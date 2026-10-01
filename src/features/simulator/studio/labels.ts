/**
 * Simulator text lives in the app's message catalogue (`simulator.*`) so it is translated
 * with the rest of the UI; English is the default. Month names travel with the labels so
 * dates in the simulator follow the UI language too.
 */
import { MONTHS } from "@/lib/months";
import { en, type Messages } from "@/i18n/messages/en";

export type SimulatorLabels = Messages["simulator"] & { months: readonly string[] };

export const defaultLabels: SimulatorLabels = { ...en.simulator, months: MONTHS.en.short };
