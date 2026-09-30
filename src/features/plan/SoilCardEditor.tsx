"use client";

import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import type { SoilCard } from "@/contracts/farm";
import { Notice } from "@/components/ui/Tone";
import { useI18n } from "@/i18n/client";
import { api } from "@/lib/api";
import { encodeImage } from "@/lib/image";

type CardKey = Exclude<keyof SoilCard, "landType">;
const FIELDS: { key: CardKey; step: string; required: boolean }[] = [
  { key: "pH", step: "0.1", required: true },
  { key: "electricalConductivity", step: "0.01", required: true },
  { key: "organicCarbon", step: "0.01", required: true },
  { key: "nitrogen", step: "1", required: true },
  { key: "phosphorus", step: "0.1", required: true },
  { key: "potassium", step: "1", required: true },
  { key: "sulphur", step: "0.1", required: false },
  { key: "zinc", step: "0.01", required: false },
  { key: "boron", step: "0.01", required: false },
];

export type SoilCardDraft = Partial<Record<CardKey, string>>;

/** Converts the editable draft to a card once the six mandatory values are present. */
export function draftToCard(draft: SoilCardDraft): SoilCard | undefined {
  const value = (k: CardKey) => (draft[k]?.trim() ? Number(draft[k]) : undefined);
  const card: Partial<SoilCard> = {};
  for (const f of FIELDS) {
    const v = value(f.key);
    if (v === undefined || Number.isNaN(v)) {
      if (f.required) return undefined;
      continue;
    }
    card[f.key] = v;
  }
  return card as SoilCard;
}

/** Soil Health Card values: type them in, or photograph the card and let Gemini read it. */
export function SoilCardEditor({ draft, onChange }: { draft: SoilCardDraft; onChange: (d: SoilCardDraft) => void }) {
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "scanning" | "read" | "notCard" | "error">("idle");

  async function scan(file: File) {
    setStatus("scanning");
    try {
      const img = await encodeImage(file);
      const res = await api.soilCard({ imageBase64: img.base64, mimeType: img.mimeType });
      if (!res.isSoilHealthCard) return setStatus("notCard");
      const next: SoilCardDraft = { ...draft };
      for (const f of FIELDS) {
        const v = res.values[f.key];
        if (v !== null && v !== undefined) next[f.key] = String(v);
      }
      onChange(next);
      setStatus("read");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="space-y-3">
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => e.target.files?.[0] && scan(e.target.files[0])} />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={status === "scanning"}
        className="inline-flex h-10 items-center gap-2 rounded-control border border-dashed border-soil px-3 text-sm font-medium text-soil hover:bg-soil-soft"
      >
        <Camera className="size-4" aria-hidden />
        {status === "scanning" ? t("plan.soilCardScanning") : t("plan.soilCardScan")}
      </button>
      {status === "read" ? <Notice tone="leaf">{t("plan.soilCardRead")}</Notice> : null}
      {status === "notCard" ? <Notice tone="sun">{t("plan.soilCardNotCard")}</Notice> : null}
      {status === "error" ? <Notice tone="alert">{t("common.errorGeneric")}</Notice> : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {FIELDS.map((f) => (
          <label key={f.key} className="block text-xs text-ink-soft">
            {t(`soilCardFields.${f.key}`)}
            <input
              type="number"
              inputMode="decimal"
              step={f.step}
              min="0"
              value={draft[f.key] ?? ""}
              onChange={(e) => onChange({ ...draft, [f.key]: e.target.value })}
              className="mt-1 h-10 w-full rounded-control border border-line bg-surface px-2 text-[15px] text-ink tabular"
            />
          </label>
        ))}
      </div>
    </div>
  );
}
