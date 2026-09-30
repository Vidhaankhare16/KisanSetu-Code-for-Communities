"use client";

import { useRef, useState } from "react";
import { AlertTriangle, Camera, Leaf, ShieldCheck, Sprout } from "lucide-react";
import type { DiagnoseResponse } from "@/contracts/api";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Input, TextArea } from "@/components/ui/Field";
import { Notice, Pill, type Tone } from "@/components/ui/Tone";
import { useI18n } from "@/i18n/client";
import { api, ApiError } from "@/lib/api";
import { useField } from "@/lib/fieldStore";
import { encodeImage, type EncodedImage } from "@/lib/image";

const SEVERITY_TONE: Record<string, Tone> = { none: "leaf", low: "leaf", medium: "sun", high: "alert" };

export function CropDoctor() {
  const { t, lang } = useI18n();
  const { place } = useField();
  const fileRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<EncodedImage | null>(null);
  const [crop, setCrop] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [result, setResult] = useState<DiagnoseResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(file: File) {
    setImage(await encodeImage(file));
    setResult(null);
    setStatus("idle");
  }

  async function diagnose() {
    if (!image) return;
    setStatus("working");
    setError(null);
    try {
      const res = await api.diagnose({
        imageBase64: image.base64,
        mimeType: image.mimeType,
        cropHint: crop || undefined,
        note: note || undefined,
        place: place ?? undefined,
        lang,
      });
      setResult(res);
      setStatus("done");
    } catch (err) {
      setError(err instanceof ApiError && err.code !== "network" ? err.message : t("common.errorNetwork"));
      setStatus("error");
    }
  }

  const d = result?.diagnosis;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="max-w-3xl">
        <h1 className="display text-4xl font-semibold sm:text-5xl">{t("doctor.title")}</h1>
        <p className="mt-3 text-lg text-ink-soft">{t("doctor.lead")}</p>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
        <div className="space-y-5">
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => e.target.files?.[0] && choose(e.target.files[0])} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-panel border-2 border-dashed border-line-strong bg-surface text-ink-soft hover:border-leaf"
          >
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image.previewUrl} alt="" className="absolute inset-0 size-full object-cover" />
            ) : (
              <span className="flex flex-col items-center gap-2">
                <Camera className="size-10 text-leaf" aria-hidden />
                <span className="font-medium text-ink">{t("doctor.upload")}</span>
              </span>
            )}
            {image ? <span className="absolute right-3 bottom-3 rounded-control bg-surface/90 px-3 py-1.5 text-sm font-medium text-ink">{t("doctor.change")}</span> : null}
          </button>

          <div>
            <FieldLabel htmlFor="doctor-crop">{t("doctor.crop")}</FieldLabel>
            <Input id="doctor-crop" value={crop} onChange={(e) => setCrop(e.target.value)} placeholder={t("doctor.cropPlaceholder")} />
          </div>
          <div>
            <FieldLabel htmlFor="doctor-note">{t("doctor.note")}</FieldLabel>
            <TextArea id="doctor-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("doctor.notePlaceholder")} maxLength={500} />
          </div>
          <Button size="lg" className="w-full" disabled={!image || status === "working"} onClick={diagnose}>
            {status === "working" ? t("doctor.working") : t("doctor.submit")}
          </Button>
          <p className="text-xs text-ink-faint">{t("doctor.disclaimer")}</p>
        </div>

        <div aria-live="polite" className="min-w-0">
          {status === "error" && error ? <Notice tone="alert">{error}</Notice> : null}
          {status === "working" ? <p className="animate-pulse text-ink-soft">{t("doctor.working")}</p> : null}
          {d ? (
            <article className="space-y-7">
              <div>
                <p className="text-sm text-ink-soft">{d.healthy ? t("doctor.healthy") : t("doctor.likely")}</p>
                <h2 className="display mt-1 text-3xl font-semibold sm:text-4xl">{d.healthy ? d.crop : d.issue}</h2>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                  <Pill tone="neutral">{d.crop}</Pill>
                  <Pill tone={SEVERITY_TONE[d.severity] ?? "neutral"}>
                    {t("doctor.severity")}: {t(`doctor.severityLevels.${d.severity}`)}
                  </Pill>
                  <span className="text-ink-soft">
                    {t("doctor.confidence")}: {Math.round(d.confidence * 100)}%
                  </span>
                </div>
                <div className="mt-3 h-1.5 max-w-xs rounded-full bg-ink/8" aria-hidden>
                  <span className="block h-full rounded-full bg-leaf" style={{ width: `${d.confidence * 100}%` }} />
                </div>
              </div>

              {d.escalate ? (
                <div className="flex gap-3 rounded-panel bg-alert-soft p-4 text-alert">
                  <AlertTriangle className="size-5 shrink-0" aria-hidden />
                  <div>
                    <p className="font-semibold">{t("doctor.escalate")}</p>
                    {d.escalateReason ? <p className="text-sm">{d.escalateReason}</p> : null}
                    <p className="mt-1 text-sm font-medium">{t("doctor.helpline")}</p>
                  </div>
                </div>
              ) : null}

              <div className="grid gap-6 md:grid-cols-2">
                <Section title={t("doctor.seen")} items={d.symptomsSeen} />
                <div>
                  <h3 className="font-semibold">{t("doctor.reasoning")}</h3>
                  <p className="mt-2 text-sm text-ink-soft">{d.whyThisDiagnosis}</p>
                  {result?.weatherContext ? <p className="mt-2 text-xs text-ink-faint">{t("doctor.weather", { weather: result.weatherContext })}</p> : null}
                </div>
              </div>

              {!d.healthy ? (
                <ol className="space-y-5">
                  <li>
                    <Section icon={<Leaf className="size-4 text-leaf" />} title={t("doctor.organic")} items={d.organicTreatment} />
                  </li>
                  {d.chemicalTreatment.length ? (
                    <li>
                      <Section icon={<ShieldCheck className="size-4 text-sun" />} title={t("doctor.chemical")} items={d.chemicalTreatment} />
                    </li>
                  ) : null}
                </ol>
              ) : null}
              <Section icon={<Sprout className="size-4 text-leaf" />} title={t("doctor.prevention")} items={d.prevention} />
            </article>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Section({ title, items, icon }: { title: string; items: string[]; icon?: React.ReactNode }) {
  if (!items.length) return null;
  return (
    <div>
      <h3 className="flex items-center gap-2 font-semibold">
        {icon}
        {title}
      </h3>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-soft">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
}
