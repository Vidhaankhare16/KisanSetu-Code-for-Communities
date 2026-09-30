"use client";

import { useEffect, useState } from "react";
import type { SimulateResponse } from "@/contracts/api";
import type { FarmProfile } from "@/contracts/farm";
import type { SimulationResult } from "@/contracts/simulation";
import { Notice } from "@/components/ui/Tone";
import { useI18n } from "@/i18n/client";
import { api } from "@/lib/api";
import { SeasonView } from "./SeasonView";
import { SimulatorVisual } from "./SimulatorVisual";

type Profile = Omit<FarmProfile, "landAcres"> & { landAcres?: number };

/**
 * Shows a crop's season: uses a simulation already in hand (top crops from the planner) or
 * fetches one from the API for any other crop. Render with `key` per crop so a new crop
 * starts from a clean state.
 */
export function SimulationLoader({ profile, cropId, preloaded }: { profile: Profile; cropId: string; preloaded?: SimulationResult }) {
  const { t, lang } = useI18n();
  const [data, setData] = useState<{ simulation: SimulationResult; analysis?: SimulateResponse["analysis"] } | null>(
    preloaded ? { simulation: preloaded } : null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Fetch the full response (with the yield analysis) even when a preview is available.
    api
      .simulate({ ...profile, cropId, lang, narrate: !preloaded })
      .then((res) => {
        if (cancelled) return;
        setData({ simulation: preloaded ?? res.simulation, analysis: res.analysis });
      })
      .catch((err: Error) => !cancelled && !preloaded && setError(err.message));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cropId, preloaded?.id]);

  if (error) return <Notice tone="alert">{error || t("common.errorGeneric")}</Notice>;
  if (!data) return <p className="animate-pulse text-ink-soft">{t("sim.running")}</p>;
  return (
    <SeasonView
      key={data.simulation.id}
      simulation={data.simulation}
      analysis={data.analysis}
      renderVisual={({ simulation, day }) => <SimulatorVisual simulation={simulation} day={day} />}
    />
  );
}
