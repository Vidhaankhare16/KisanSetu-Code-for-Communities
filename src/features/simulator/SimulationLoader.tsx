"use client";

import { useEffect, useState } from "react";
import type { SimulateResponse } from "@/contracts/api";
import type { FarmProfile } from "@/contracts/farm";
import type { SimulationResult } from "@/contracts/simulation";
import { Notice } from "@/components/ui/Tone";
import { useI18n } from "@/i18n/client";
import { api } from "@/lib/api";
import { SeasonView } from "./SeasonView";

type Profile = Omit<FarmProfile, "landAcres"> & { landAcres?: number };

interface Loaded {
  simulation: SimulationResult;
  analysis?: SimulateResponse["analysis"];
  compare?: SimulationResult;
}

/**
 * Shows a crop's season: uses a simulation already in hand (top crops from the planner) or
 * fetches it, plus an optional second crop to compare. Render with `key` per selection so a
 * new choice starts from a clean state.
 */
export function SimulationLoader({
  profile,
  cropId,
  compareCropId,
  preloaded,
}: {
  profile: Profile;
  cropId: string;
  compareCropId?: string;
  preloaded?: SimulationResult;
}) {
  const { t, lang } = useI18n();
  const [data, setData] = useState<Loaded | null>(preloaded ? { simulation: preloaded } : null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // The full response carries the yield analysis even when a preview is already shown.
    Promise.all([
      api.simulate({ ...profile, cropId, lang, narrate: !preloaded }),
      compareCropId ? api.simulate({ ...profile, cropId: compareCropId, lang, narrate: false }) : Promise.resolve(null),
    ])
      .then(([main, other]) => {
        if (cancelled) return;
        setData({ simulation: preloaded ?? main.simulation, analysis: main.analysis, compare: other?.simulation });
      })
      .catch((err: Error) => !cancelled && !preloaded && setError(err.message));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cropId, compareCropId, preloaded?.id]);

  if (error) return <Notice tone="alert">{error || t("common.errorGeneric")}</Notice>;
  if (!data) return <p className="animate-pulse text-ink-soft">{t("sim.running")}</p>;
  return (
    <SeasonView key={`${data.simulation.id}-${data.compare?.id ?? ""}`} simulation={data.simulation} analysis={data.analysis} compareWith={data.compare} />
  );
}
