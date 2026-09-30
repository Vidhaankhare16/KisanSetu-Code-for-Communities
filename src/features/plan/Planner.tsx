"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Link2, MapPin } from "lucide-react";
import type { RecommendResponse } from "@/contracts/api";
import type { FarmerPriority, IrrigationMethod, SoilTexture, WaterAccess } from "@/contracts/farm";
import { SoilTextureSchema } from "@/contracts/farm";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Input, Select } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import { Notice } from "@/components/ui/Tone";
import { CROPS } from "@/domain/crops/catalog";
import { FieldContextPanel } from "@/features/field/FieldContextPanel";
import { FieldSearch } from "@/features/field/FieldSearch";
import { SimulationLoader } from "@/features/simulator/SimulationLoader";
import { useI18n } from "@/i18n/client";
import { api, ApiError } from "@/lib/api";
import { useField } from "@/lib/fieldStore";
import { longDate, todayIso } from "@/lib/format";
import { AdvisoryPanel } from "./AdvisoryPanel";
import { RankingList } from "./RankingList";
import { draftToCard, SoilCardEditor, type SoilCardDraft } from "./SoilCardEditor";

type Status = "idle" | "loading" | "done" | "error";
const PROGRESS_STEPS = ["plan.stepContext", "plan.stepSimulate", "plan.stepAdvise"] as const;
const STEP_DELAYS_MS = [0, 2500, 6000];

export function Planner({ initial }: { initial?: RecommendResponse }) {
  const { t, lang } = useI18n();
  const { place, setPlace, ready } = useField();

  const [sowingDate, setSowingDate] = useState(todayIso());
  const [water, setWater] = useState<WaterAccess>("limited");
  const [method, setMethod] = useState<IrrigationMethod>("flood");
  const [landAcres, setLandAcres] = useState("1");
  const [previousCrop, setPreviousCrop] = useState("");
  const [soilTexture, setSoilTexture] = useState<SoilTexture | "">("");
  const [soilOpen, setSoilOpen] = useState(false);
  const [soilDraft, setSoilDraft] = useState<SoilCardDraft>({});
  const [priority, setPriority] = useState<FarmerPriority>("balanced");
  const [includeVegetables, setIncludeVegetables] = useState(false);

  const [status, setStatus] = useState<Status>(initial ? "done" : "idle");
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RecommendResponse | null>(initial ?? null);
  const [selected, setSelected] = useState<string | undefined>(initial?.ranking[0]?.crop.id);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (status !== "loading") return;
    const timers = STEP_DELAYS_MS.map((ms, i) => setTimeout(() => setStep(i), ms));
    return () => timers.forEach(clearTimeout);
  }, [status]);

  const profile = useMemo(
    () =>
      place
        ? {
            place,
            sowingDate,
            landAcres: Number(landAcres) || 1,
            water,
            irrigationMethod: method,
            ...(soilTexture ? { soilTexture } : {}),
            ...(draftToCard(soilDraft) ? { soilCard: draftToCard(soilDraft) } : {}),
            ...(previousCrop ? { previousCrop } : {}),
          }
        : null,
    [place, sowingDate, landAcres, water, method, soilTexture, soilDraft, previousCrop],
  );

  async function submit() {
    if (!profile) return;
    setStatus("loading");
    setStep(0);
    setError(null);
    try {
      const res = await api.recommend({ ...profile, priority, includeVegetables, lang });
      setResult(res);
      setSelected(res.ranking[0]?.crop.id);
      setStatus("done");
      requestAnimationFrame(() => document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (err) {
      setError(err instanceof ApiError && err.code !== "network" ? err.message : t("common.errorNetwork"));
      setStatus("error");
    }
  }

  async function share() {
    if (!result) return;
    await navigator.clipboard.writeText(`${location.origin}/plan/${result.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const selectedPreloaded = result?.topSimulations.find((s) => s.crop.id === selected);
  const resultProfile = result
    ? { place: result.place, sowingDate: result.sowingDate, water, irrigationMethod: method, landAcres: Number(landAcres) || 1 }
    : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <header className="max-w-3xl">
        <h1 className="display text-4xl font-semibold sm:text-5xl">{t("plan.title")}</h1>
        <p className="mt-3 text-lg text-ink-soft">{t("plan.lead")}</p>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <form
          className="space-y-7 self-start lg:sticky lg:top-24"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <section className="rounded-panel border border-line bg-surface p-5">
            {ready && place ? (
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <p className="flex items-start gap-2">
                    <MapPin className="mt-1 size-5 text-leaf" aria-hidden />
                    <span>
                      <span className="block text-lg font-semibold">{place.name}</span>
                      <span className="text-sm text-ink-soft">{[place.district, place.state].filter(Boolean).join(", ")}</span>
                    </span>
                  </p>
                  <Button variant="quiet" size="sm" onClick={() => setPlace(null)}>
                    {t("field.change")}
                  </Button>
                </div>
                <FieldContextPanel place={place} />
              </div>
            ) : (
              <div>
                <p className="mb-3 font-medium">{t("field.whereIsField")}</p>
                <FieldSearch onPick={setPlace} />
              </div>
            )}
          </section>

          <div>
            <FieldLabel htmlFor="sowing">{t("plan.sowingDate")}</FieldLabel>
            <Input id="sowing" type="date" value={sowingDate} onChange={(e) => setSowingDate(e.target.value)} required />
          </div>

          <Segmented
            label={t("plan.water")}
            value={water}
            onChange={setWater}
            options={(["rainfed", "limited", "assured"] as const).map((v) => ({ value: v, label: t(`plan.waterOptions.${v}`) }))}
          />
          {water !== "rainfed" ? (
            <Segmented
              label={t("plan.method")}
              value={method}
              onChange={setMethod}
              options={(["flood", "sprinkler", "drip"] as const).map((v) => ({ value: v, label: t(`plan.methodOptions.${v}`) }))}
            />
          ) : null}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel htmlFor="land" hint={`(${t("common.acres")})`}>
                {t("plan.land")}
              </FieldLabel>
              <Input id="land" type="number" min="0.1" step="0.1" inputMode="decimal" value={landAcres} onChange={(e) => setLandAcres(e.target.value)} />
            </div>
            <div>
              <FieldLabel htmlFor="prev">{t("plan.previousCrop")}</FieldLabel>
              <Select id="prev" value={previousCrop} onChange={(e) => setPreviousCrop(e.target.value)}>
                <option value="">{t("plan.previousCropNone")}</option>
                {CROPS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.localName})
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <FieldLabel htmlFor="texture">{t("plan.soil")}</FieldLabel>
            <Select id="texture" value={soilTexture} onChange={(e) => setSoilTexture(e.target.value as SoilTexture | "")}>
              <option value="">{t("plan.soilAuto")}</option>
              {SoilTextureSchema.options.map((tx) => (
                <option key={tx} value={tx}>
                  {t(`soilTexture.${tx}`)}
                </option>
              ))}
            </Select>
            <button
              type="button"
              onClick={() => setSoilOpen((o) => !o)}
              aria-expanded={soilOpen}
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-soil"
            >
              <ChevronDown className={`size-4 transition-transform ${soilOpen ? "rotate-180" : ""}`} aria-hidden />
              {t("plan.soilCard")}
            </button>
            {soilOpen ? (
              <div className="mt-3">
                <SoilCardEditor draft={soilDraft} onChange={setSoilDraft} />
              </div>
            ) : null}
          </div>

          <Segmented
            label={t("plan.priority")}
            value={priority}
            onChange={setPriority}
            options={(["balanced", "profit", "low_risk", "save_water", "soil_health"] as const).map((v) => ({ value: v, label: t(`plan.priorityOptions.${v}`) }))}
          />

          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" checked={includeVegetables} onChange={(e) => setIncludeVegetables(e.target.checked)} className="mt-0.5 size-4 accent-leaf-deep" />
            {t("plan.includeVegetables")}
          </label>

          <Button type="submit" size="lg" className="w-full" disabled={!place || status === "loading"}>
            {status === "loading" ? t(PROGRESS_STEPS[step]!) : t("plan.submit")}
          </Button>
        </form>

        <div id="results" className="min-w-0 scroll-mt-24 space-y-10">
          {status === "idle" && !result ? (
            <div className="rounded-panel border border-dashed border-line-strong p-10 text-center">
              <p className="display text-2xl font-semibold">{t("plan.emptyTitle")}</p>
              <p className="mx-auto mt-2 max-w-md text-ink-soft">{t("plan.emptyBody")}</p>
            </div>
          ) : null}

          {status === "loading" ? <Progress step={step} /> : null}
          {status === "error" && error ? <Notice tone="alert">{error}</Notice> : null}

          {result && status !== "loading" ? (
            <>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="display text-3xl font-semibold">{t("plan.resultsTitle", { place: result.place.name })}</h2>
                  <p className="mt-1 text-ink-soft">{t("plan.resultsLead", { date: longDate(result.sowingDate, lang) })}</p>
                </div>
                <Button variant="secondary" size="sm" onClick={share}>
                  {copied ? <Check className="size-4 text-leaf" /> : <Link2 className="size-4" />}
                  {copied ? t("plan.copied") : t("plan.share")}
                </Button>
              </div>

              {result.warnings.map((w) => (
                <Notice key={w} tone="sun">
                  {w}
                </Notice>
              ))}

              <RankingList ranking={result.ranking} selectedId={selected} onSelect={setSelected} />

              {result.advisory ? <AdvisoryPanel advisory={result.advisory} ranking={result.ranking} /> : <Notice tone="neutral">{t("common.aiUnavailable")}</Notice>}

              {selected && resultProfile ? (
                <section aria-label={t("sim.title")} className="border-t border-line pt-10">
                  <SimulationLoader key={selected} profile={resultProfile} cropId={selected} preloaded={selectedPreloaded} />
                </section>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Progress({ step }: { step: number }) {
  const { t } = useI18n();
  return (
    <ol className="space-y-3 rounded-panel border border-line bg-surface p-6" aria-live="polite">
      {PROGRESS_STEPS.map((key, i) => (
        <li key={key} className={`flex items-center gap-3 ${i > step ? "text-ink-faint" : ""}`}>
          <span
            className={`size-2.5 rounded-full ${i < step ? "bg-leaf" : i === step ? "animate-pulse bg-water" : "bg-line-strong"}`}
            aria-hidden
          />
          {t(key)}
        </li>
      ))}
    </ol>
  );
}
