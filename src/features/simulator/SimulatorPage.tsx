"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import type { SimulateResponse } from "@/contracts/api";
import type { IrrigationMethod, Place, WaterAccess } from "@/contracts/farm";
import type { SimulationResult } from "@/contracts/simulation";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Input, Select } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import { CROPS } from "@/domain/crops/catalog";
import { CropIcon } from "@/features/crops/art/CropIcon";
import { FieldSearch } from "@/features/field/FieldSearch";
import { PageHeader } from "@/components/shell/PageHeader";
import { useI18n } from "@/i18n/client";
import { cropLabel } from "@/i18n/crops";
import { cn } from "@/lib/cn";
import { useField } from "@/lib/fieldStore";
import { todayIso } from "@/lib/format";
import { SeasonView } from "./SeasonView";
import { SimulationLoader } from "./SimulationLoader";

export interface SampleSeason {
  simulation: SimulationResult;
  analysis?: SimulateResponse["analysis"];
}

interface Run {
  key: number;
  place: Place;
  cropId: string;
  compareCropId?: string;
  sowingDate: string;
  water: WaterAccess;
  method: IrrigationMethod;
}

/** Any crop, any field, any sowing date — with a pre-computed sample season shown instantly. */
export function SimulatorPage({ samples }: { samples: SampleSeason[] }) {
  const { t, lang } = useI18n();
  const { place, setPlace } = useField();
  const [cropId, setCropId] = useState("mustard");
  const [compareCropId, setCompareCropId] = useState("");
  const [sowingDate, setSowingDate] = useState(todayIso());
  const [water, setWater] = useState<WaterAccess>("limited");
  const [method, setMethod] = useState<IrrigationMethod>("flood");
  const [run, setRun] = useState<Run | null>(null);
  const [sampleIndex, setSampleIndex] = useState(0);
  const sample = samples[sampleIndex];

  const cropOptions = CROPS.map((c) => (
    <option key={c.id} value={c.id}>
      {cropLabel(t, c.id, c.name)}
      {lang === "en" ? ` (${c.localName})` : ""}
    </option>
  ));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <PageHeader title={t("sim.title")} lead={t("sim.lead")} crops={["wheat", "mustard", "chickpea", "cotton", "maize"]} />

      <form
        className="mt-8 grid gap-5 rounded-panel border border-line bg-surface p-5 lg:grid-cols-[1.3fr_1fr_1fr_1fr_auto] lg:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          if (!place) return;
          setRun({ key: Date.now(), place, cropId, compareCropId: compareCropId || undefined, sowingDate, water, method });
        }}
      >
        <div>
          {place ? (
            <div>
              <FieldLabel>{t("field.selected")}</FieldLabel>
              <p className="flex h-11 items-center gap-2">
                <MapPin className="size-4 text-leaf" aria-hidden />
                <span className="font-medium">{place.name}</span>
                <Button variant="quiet" size="sm" onClick={() => setPlace(null)}>
                  {t("field.change")}
                </Button>
              </p>
            </div>
          ) : (
            <FieldSearch onPick={setPlace} />
          )}
        </div>
        <div>
          <FieldLabel htmlFor="sim-crop">{t("sim.crop")}</FieldLabel>
          <Select id="sim-crop" value={cropId} onChange={(e) => setCropId(e.target.value)}>
            {cropOptions}
          </Select>
        </div>
        <div>
          <FieldLabel htmlFor="sim-compare">{t("sim.compare")}</FieldLabel>
          <Select id="sim-compare" value={compareCropId} onChange={(e) => setCompareCropId(e.target.value)}>
            <option value="">{t("sim.compareNone")}</option>
            {cropOptions}
          </Select>
        </div>
        <div>
          <FieldLabel htmlFor="sim-date">{t("plan.sowingDate")}</FieldLabel>
          <Input id="sim-date" type="date" value={sowingDate} onChange={(e) => setSowingDate(e.target.value)} />
        </div>
        <Button type="submit" disabled={!place}>
          {t("sim.run")}
        </Button>
        <Segmented
          className="lg:col-span-2"
          label={t("plan.water")}
          value={water}
          onChange={setWater}
          options={(["rainfed", "limited", "assured"] as const).map((v) => ({ value: v, label: t(`plan.waterOptions.${v}`) }))}
        />
        {water !== "rainfed" ? (
          <Segmented
            className="lg:col-span-3"
            label={t("plan.method")}
            value={method}
            onChange={setMethod}
            options={(["flood", "sprinkler", "drip"] as const).map((v) => ({ value: v, label: t(`plan.methodOptions.${v}`) }))}
          />
        ) : null}
      </form>

      {!run && samples.length ? (
        <div className="mt-6">
          <p className="text-sm text-ink-soft">{t("sim.samplesLead")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {samples.map((s, i) => (
              <button
                key={s.simulation.id}
                type="button"
                onClick={() => setSampleIndex(i)}
                aria-pressed={i === sampleIndex}
                className={cn(
                  "flex items-center gap-2 rounded-full border py-1 pr-4 pl-1 text-sm",
                  i === sampleIndex ? "border-leaf-deep bg-leaf-soft text-leaf-deep" : "border-line bg-surface hover:border-line-strong",
                )}
              >
                <CropIcon cropId={s.simulation.crop.id} className="size-8" />
                {cropLabel(t, s.simulation.crop.id, s.simulation.crop.name)}, {s.simulation.location.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-8">
        {run ? (
          <SimulationLoader
            key={run.key}
            cropId={run.cropId}
            compareCropId={run.compareCropId}
            profile={{ place: run.place, sowingDate: run.sowingDate, water: run.water, irrigationMethod: run.method }}
          />
        ) : sample ? (
          <SeasonView key={sample.simulation.id} simulation={sample.simulation} analysis={sample.analysis} />
        ) : null}
      </div>
    </div>
  );
}
