"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import type { IrrigationMethod, Place, WaterAccess } from "@/contracts/farm";
import type { SimulationResult } from "@/contracts/simulation";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Input, Select } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import { CROPS } from "@/domain/crops/catalog";
import { FieldSearch } from "@/features/field/FieldSearch";
import { useI18n } from "@/i18n/client";
import { cropLabel } from "@/i18n/crops";
import { useField } from "@/lib/fieldStore";
import { todayIso } from "@/lib/format";
import { SeasonView } from "./SeasonView";
import { SimulationLoader } from "./SimulationLoader";
import { SimulatorVisual } from "./SimulatorVisual";

interface Run {
  key: number;
  place: Place;
  cropId: string;
  sowingDate: string;
  water: WaterAccess;
  method: IrrigationMethod;
}

/** Any crop, any field, any sowing date — or an instant pre-computed sample season. */
export function SimulatorPage({ samples }: { samples: SimulationResult[] }) {
  const { t, lang } = useI18n();
  const { place, setPlace } = useField();
  const [cropId, setCropId] = useState("mustard");
  const [sowingDate, setSowingDate] = useState(todayIso());
  const [water, setWater] = useState<WaterAccess>("limited");
  const [method, setMethod] = useState<IrrigationMethod>("flood");
  const [run, setRun] = useState<Run | null>(null);
  const [sample, setSample] = useState<SimulationResult | null>(null);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <header className="max-w-3xl">
        <h1 className="display text-4xl font-semibold sm:text-5xl">{t("sim.title")}</h1>
        <p className="mt-3 text-lg text-ink-soft">{t("sim.lead")}</p>
      </header>

      <form
        className="mt-8 grid gap-5 rounded-panel border border-line bg-surface p-5 lg:grid-cols-[1.4fr_1fr_1fr_auto] lg:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          if (!place) return;
          setSample(null);
          setRun({ key: Date.now(), place, cropId, sowingDate, water, method });
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
            {CROPS.map((c) => (
              <option key={c.id} value={c.id}>
                {cropLabel(t, c.id, c.name)} ({lang === "en" ? c.localName : c.name})
              </option>
            ))}
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
            className="lg:col-span-2"
            label={t("plan.method")}
            value={method}
            onChange={setMethod}
            options={(["flood", "sprinkler", "drip"] as const).map((v) => ({ value: v, label: t(`plan.methodOptions.${v}`) }))}
          />
        ) : null}
      </form>

      {!run && samples.length ? (
        <div className="mt-6 flex flex-wrap gap-2">
          {samples.map((s) => (
            <Button key={s.id} variant="secondary" size="sm" onClick={() => setSample(s)} aria-pressed={sample?.id === s.id}>
              {cropLabel(t, s.crop.id, s.crop.name)}, {s.location.name}
            </Button>
          ))}
        </div>
      ) : null}

      <div className="mt-10">
        {run ? (
          <SimulationLoader
            key={run.key}
            cropId={run.cropId}
            profile={{ place: run.place, sowingDate: run.sowingDate, water: run.water, irrigationMethod: run.method }}
          />
        ) : sample ? (
          <SeasonView
            key={sample.id}
            simulation={sample}
            renderVisual={({ simulation, day }) => <SimulatorVisual simulation={simulation} day={day} />}
          />
        ) : null}
      </div>
    </div>
  );
}
