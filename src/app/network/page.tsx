import type { Metadata } from "next";
import Link from "next/link";
import type { CropCategory } from "@/contracts/simulation";
import { CROPS } from "@/domain/crops/catalog";
import { modelCards, NATIONAL_MODEL_VERSION } from "@/domain/crops/registry";
import { CATEGORY_COLOR, OutlookMap } from "@/features/network/OutlookMap";
import { getLang, getMessages } from "@/i18n/server";
import { createTranslator } from "@/i18n/translate";
import { inr, longDate, pct } from "@/lib/format";
import { getNetworkSummary } from "@/server/services/network";

export const metadata: Metadata = {
  title: "State dashboard",
  description: "Model-based rabi outlook for districts across India, crop-health reports and the shared crop-model registry.",
};

// Live activity must reflect the current state of the network, not the build.
export const dynamic = "force-dynamic";

export default async function NetworkPage() {
  const lang = await getLang();
  const t = createTranslator(await getMessages(lang));
  const { outlook, stats, recentDiagnoses } = await getNetworkSummary();

  const categoryOf = Object.fromEntries(CROPS.map((c) => [c.id, c.category])) as Record<string, CropCategory>;
  const nameOf = Object.fromEntries(CROPS.map((c) => [c.id, c.name]));
  const districts = [...outlook.districts].sort((a, b) => a.state.localeCompare(b.state) || a.district.localeCompare(b.district));

  const leaders = new Map<string, number>();
  districts.forEach((d) => leaders.set(d.top[0]!.cropId, (leaders.get(d.top[0]!.cropId) ?? 0) + 1));
  const leaderList = [...leaders.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <header className="max-w-3xl">
        <h1 className="display text-4xl font-semibold sm:text-5xl">{t("network.title")}</h1>
        <p className="mt-3 text-lg text-ink-soft">{t("network.lead")}</p>
      </header>

      <section className="mt-12" aria-labelledby="outlook">
        <h2 id="outlook" className="display text-2xl font-semibold sm:text-3xl">
          {t("network.outlookTitle")}
        </h2>
        <p className="mt-2 text-ink-soft">{t("network.outlookLead", { date: longDate(outlook.sowingDate, lang) })}</p>

        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div className="rounded-panel border border-line bg-surface p-4">
            <OutlookMap districts={districts} categoryOf={categoryOf} nameOf={nameOf} />
            <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
              {leaderList.map(([cropId, count]) => (
                <li key={cropId} className="flex items-center gap-2">
                  <span className="size-3 rounded-full" style={{ background: CATEGORY_COLOR[categoryOf[cropId] ?? "cereal"] }} aria-hidden />
                  {nameOf[cropId]} <span className="text-ink-faint tabular">{count}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="max-h-[42rem] overflow-auto rounded-panel border border-line bg-surface">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="sticky top-0 bg-surface text-xs text-ink-soft">
                <tr className="border-b border-line">
                  <th className="px-4 py-3 font-medium">{t("network.district")}</th>
                  <th className="px-4 py-3 font-medium">{t("network.topCrop")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("network.profit")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("network.water")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("network.drySpell")}</th>
                </tr>
              </thead>
              <tbody>
                {districts.map((d) => {
                  const top = d.top[0]!;
                  return (
                    <tr key={`${d.district}-${d.state}`} className="border-b border-line last:border-0">
                      <td className="px-4 py-2.5">
                        <span className="font-medium">{d.district}</span>
                        <span className="block text-xs text-ink-soft">
                          {d.state} · {t(`plan.waterOptions.${d.water}`)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        {nameOf[top.cropId]}
                        <span className="block text-xs text-ink-faint">{d.top.slice(1).map((c) => nameOf[c.cropId]).join(", ")}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular">{inr(top.profitP50)}</td>
                      <td className="px-4 py-2.5 text-right text-water tabular">{Math.round(top.irrigationMm)} mm</td>
                      <td className="px-4 py-2.5 text-right tabular">{pct(top.probDrySpell)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <p className="mt-3 text-xs text-ink-faint">{outlook.method}.</p>
      </section>

      <section className="mt-16 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="display text-2xl font-semibold">{t("network.activityTitle")}</h2>
          {stats.byState.length ? (
            <ul className="mt-4 divide-y divide-line rounded-panel border border-line bg-surface">
              {stats.byState.map((s) => (
                <li key={s.state} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="font-medium">{s.state}</span>
                  <span className="text-ink-soft tabular">
                    {s.advisories} {t("network.advisories")} · {s.diagnoses} {t("network.diagnoses")}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-panel border border-dashed border-line-strong p-6 text-ink-soft">{t("network.activityEmpty")}</p>
          )}
        </div>
        <div>
          <h2 className="display text-2xl font-semibold">{t("network.reportsTitle")}</h2>
          {recentDiagnoses.length ? (
            <ul className="mt-4 divide-y divide-line rounded-panel border border-line bg-surface">
              {recentDiagnoses.map((r) => (
                <li key={r.id} className="px-4 py-3 text-sm">
                  <span className="font-medium">{r.issue}</span> <span className="text-ink-soft">— {r.crop}</span>
                  <span className="block text-xs text-ink-faint">
                    {[r.district, r.state].filter(Boolean).join(", ") || "—"} · {longDate(r.createdAt.slice(0, 10), lang)} · {r.severity}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-panel border border-dashed border-line-strong p-6 text-ink-soft">{t("network.reportsEmpty")}</p>
          )}
        </div>
      </section>

      <section className="mt-16" aria-labelledby="models">
        <h2 id="models" className="display text-2xl font-semibold">
          {t("network.modelsTitle")}
        </h2>
        <p className="mt-2 max-w-[70ch] text-ink-soft">{t("network.modelsLead")}</p>
        <ul className="mt-6 grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {modelCards().map((m) => (
            <li key={m.id} className="flex items-baseline justify-between gap-3 border-b border-line py-2 text-sm">
              <span>
                <span className="font-medium">{m.parameters.name}</span>
                <span className="block text-xs text-ink-faint tabular">
                  Kc {m.parameters.kc.mid} · Ky {m.parameters.ky} · {m.parameters.durationDays} {t("common.days")}
                </span>
              </span>
              <Link href={`/api/v1/models/${m.parameters.id}`} className="shrink-0 text-water hover:underline">
                {t("network.downloadModel")}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-ink-faint tabular">{NATIONAL_MODEL_VERSION}</p>
      </section>
    </div>
  );
}
