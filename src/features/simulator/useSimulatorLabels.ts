"use client";

import { useMemo } from "react";
import { useI18n } from "@/i18n/client";
import { en, type Messages } from "@/i18n/messages/en";
import type { MessageKey } from "@/i18n/translate";
import { MONTHS } from "@/lib/months";
import type { SimulatorLabels } from "./studio/labels";

/** Simulator labels in the current UI language. */
export function useSimulatorLabels(): SimulatorLabels {
  const { t, lang } = useI18n();
  return useMemo(
    () => ({
      ...(Object.fromEntries(Object.keys(en.simulator).map((key) => [key, t(`simulator.${key}` as MessageKey)])) as Messages["simulator"]),
      months: MONTHS[lang].short,
    }),
    [t, lang],
  );
}
