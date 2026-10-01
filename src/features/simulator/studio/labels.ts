/**
 * Simulator text lives in the app's message catalogue (`simulator.*`) so it is translated
 * with the rest of the UI; English is the default.
 */
import { en, type Messages } from "@/i18n/messages/en";

export type SimulatorLabels = Messages["simulator"];

export const defaultLabels: SimulatorLabels = en.simulator;
