"use client";

import { useState } from "react";
import { CheckCircle2, ExternalLink, Leaf, XCircle } from "lucide-react";
import type { EligibilityProfile } from "@/contracts/api";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Input } from "@/components/ui/Field";
import { Notice, Pill } from "@/components/ui/Tone";
import { useI18n } from "@/i18n/client";
import type { MessageKey } from "@/i18n/translate";
import { api, type SchemeDto } from "@/lib/api";

type Flag = "ownsLand" | "isTenant" | "hasKcc" | "isFpoMember" | "inOilseedCluster" | "hasRiceFallow" | "isIncomeTaxPayer";

const FLAGS: { key: Flag; label: MessageKey }[] = [
  { key: "ownsLand", label: "schemes.ownsLand" },
  { key: "isTenant", label: "schemes.isTenant" },
  { key: "hasKcc", label: "schemes.hasKcc" },
  { key: "isFpoMember", label: "schemes.isFpo" },
  { key: "inOilseedCluster", label: "schemes.inCluster" },
  { key: "hasRiceFallow", label: "schemes.riceFallow" },
  { key: "isIncomeTaxPayer", label: "schemes.taxPayer" },
];

type Match = { scheme: SchemeDto; result: { eligible: boolean; reason: string } };

export function SchemeChecker() {
  const { t } = useI18n();
  const [landAcres, setLandAcres] = useState("2");
  const [age, setAge] = useState("");
  const [flags, setFlags] = useState<Record<Flag, boolean>>({
    ownsLand: true,
    isTenant: false,
    hasKcc: false,
    isFpoMember: false,
    inOilseedCluster: false,
    hasRiceFallow: false,
    isIncomeTaxPayer: false,
  });
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [error, setError] = useState(false);

  async function check() {
    setError(false);
    try {
      const profile: Partial<EligibilityProfile> = { landAcres: Number(landAcres) || 0, ...flags, ...(age ? { age: Number(age) } : {}) };
      setMatches((await api.eligibility(profile)).matches);
    } catch {
      setError(true);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="max-w-3xl">
        <h1 className="display text-4xl font-semibold sm:text-5xl">{t("schemes.title")}</h1>
        <p className="mt-3 text-lg text-ink-soft">{t("schemes.lead")}</p>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <form
          className="space-y-5 self-start rounded-panel border border-line bg-surface p-5"
          onSubmit={(e) => {
            e.preventDefault();
            void check();
          }}
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel htmlFor="s-land" hint={`(${t("common.acres")})`}>
                {t("plan.land")}
              </FieldLabel>
              <Input id="s-land" type="number" min="0" step="0.1" value={landAcres} onChange={(e) => setLandAcres(e.target.value)} />
            </div>
            <div>
              <FieldLabel htmlFor="s-age">{t("schemes.age")}</FieldLabel>
              <Input id="s-age" type="number" min="14" max="110" value={age} onChange={(e) => setAge(e.target.value)} />
            </div>
          </div>
          <fieldset className="space-y-3">
            {FLAGS.map((f) => (
              <label key={f.key} className="flex items-start gap-3 text-[15px]">
                <input
                  type="checkbox"
                  checked={flags[f.key]}
                  onChange={(e) => setFlags({ ...flags, [f.key]: e.target.checked })}
                  className="mt-1 size-4 accent-leaf-deep"
                />
                {t(f.label)}
              </label>
            ))}
          </fieldset>
          <Button type="submit" className="w-full">
            {t("schemes.check")}
          </Button>
        </form>

        <div className="min-w-0 space-y-3" aria-live="polite">
          {error ? <Notice tone="alert">{t("common.errorNetwork")}</Notice> : null}
          {matches?.map(({ scheme, result }) => (
            <details key={scheme.id} className="group rounded-panel border border-line bg-surface open:border-line-strong">
              <summary className="flex cursor-pointer list-none items-start gap-3 p-4">
                {result.eligible ? (
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-leaf" aria-label={t("schemes.eligible")} />
                ) : (
                  <XCircle className="mt-0.5 size-5 shrink-0 text-ink-faint" aria-label={t("schemes.notEligible")} />
                )}
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{scheme.name}</span>
                    {scheme.regenerative ? (
                      <Pill tone="leaf">
                        <Leaf className="size-3" aria-hidden />
                        {t("schemes.regenerative")}
                      </Pill>
                    ) : null}
                  </span>
                  <span className="mt-1 block text-sm text-ink-soft">{scheme.benefit}</span>
                  <span className={`mt-1 block text-sm ${result.eligible ? "text-leaf-deep" : "text-ink-soft"}`}>{result.reason}</span>
                </span>
              </summary>
              <div className="space-y-3 border-t border-line px-4 py-4 pl-12 text-sm">
                <ul className="list-disc space-y-1 pl-4 text-ink-soft">
                  {scheme.details.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
                <p>
                  <span className="font-medium">{t("schemes.howToApply")}: </span>
                  {scheme.howToApply}
                </p>
                <a href={scheme.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-water hover:underline">
                  {t("schemes.website")}
                  <ExternalLink className="size-3.5" aria-hidden />
                </a>
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
