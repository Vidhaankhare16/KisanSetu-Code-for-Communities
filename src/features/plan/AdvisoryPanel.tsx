"use client";

import { Leaf, RefreshCcw, TestTubeDiagonal } from "lucide-react";
import type { AdvisoryBrief } from "@/contracts/ai";
import type { RankedCropDto } from "@/contracts/api";
import { useI18n } from "@/i18n/client";

/** Gemini's explanation of the ranking and the regenerative plan, grounded in model numbers. */
export function AdvisoryPanel({ advisory, ranking }: { advisory: AdvisoryBrief; ranking: RankedCropDto[] }) {
  const { t } = useI18n();
  const nameOf = (id: string) => ranking.find((r) => r.crop.id === id)?.crop.name ?? id;

  return (
    <section aria-labelledby="advice-title" className="space-y-8">
      <div>
        <h2 id="advice-title" className="text-sm font-medium text-ink-soft">
          {t("plan.adviceTitle")}
        </h2>
        <p className="display mt-2 max-w-[40ch] text-2xl font-semibold sm:text-3xl">{advisory.headline}</p>
        <p className="mt-3 max-w-[70ch] text-ink-soft">{advisory.summary}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {advisory.crops.map((c) => (
          <div key={c.cropId} className="border-t-2 border-leaf pt-3">
            <h3 className="font-semibold">{nameOf(c.cropId)}</h3>
            <p className="mt-1 text-sm text-ink-soft">{c.why}</p>
            {c.watchOut.length ? (
              <>
                <p className="mt-3 text-xs font-medium text-alert">{t("plan.watchOut")}</p>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-ink-soft">
                  {c.watchOut.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        ))}
      </div>

      <div className="rounded-panel bg-leaf-soft/60 p-5 sm:p-6">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-leaf-deep">
          <Leaf className="size-5" aria-hidden />
          {t("plan.regenTitle")}
        </h3>
        <ul className="mt-4 grid gap-5 md:grid-cols-2">
          {advisory.regenerativePlan.map((p) => (
            <li key={p.practice}>
              <p className="font-semibold">{p.practice}</p>
              <p className="text-sm text-ink-soft">{p.why}</p>
              <p className="mt-1 text-sm">{p.how}</p>
              <p className="mt-1 text-xs text-leaf-deep">{p.timing}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="flex items-center gap-2 font-semibold text-soil">
            <TestTubeDiagonal className="size-4" aria-hidden />
            {t("plan.soilActions")}
          </h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-soft">
            {advisory.soilActions.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="flex items-center gap-2 font-semibold text-water">
            <RefreshCcw className="size-4" aria-hidden />
            {t("plan.rotation")}
          </h3>
          <p className="mt-2 text-sm text-ink-soft">{advisory.rotationTip}</p>
        </div>
      </div>
    </section>
  );
}
