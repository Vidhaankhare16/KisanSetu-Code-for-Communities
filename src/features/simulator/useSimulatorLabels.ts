"use client";

import { useMemo } from "react";
import { useI18n } from "@/i18n/client";
import { en } from "@/i18n/messages/en";
import type { MessageKey } from "@/i18n/translate";
import type { SimulatorLabels } from "./studio/labels";

/** Simulator labels in the current UI language. */
export function useSimulatorLabels(): SimulatorLabels {
  const { t } = useI18n();
  return useMemo(() => Object.fromEntries(Object.keys(en.simulator).map((key) => [key, t(`simulator.${key}` as MessageKey)])) as SimulatorLabels, [t]);
}
