"use client";

/**
 * The "why" behind a season: how the crop did in each of the last ten seasons, where its
 * water came from, what limited the yield, and how the soil-health score is made up.
 */
import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SimulateResponse } from "@/contracts/api";
import { useI18n } from "@/i18n/client";
import { inr, num } from "@/lib/format";

type Analysis = SimulateResponse["analysis"];

const KG_HA_TO_Q_ACRE = 0.404686 / 100;

export function SeasonInsights({ analysis }: { analysis: Analysis }) {
  const { t } = useI18n();
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel title={t("insights.historyTitle")} lead={t("insights.historyLead")}>
        <HistoryChart members={analysis.members} />
      </Panel>
      <Panel title={t("insights.waterTitle")} lead={t("insights.waterLead")}>
        <WaterBudget balance={analysis.waterBalance} />
      </Panel>
      <Panel title={t("sim.yieldLimits")} lead={t("insights.limitsLead")}>
        <YieldFactors factors={analysis.yieldFactors} />
      </Panel>
      <Panel title={t("insights.soilTitle")} lead={t("insights.soilLead", { score: analysis.regenerative.score })}>
        <RegenFactors factors={analysis.regenerative.factors} />
      </Panel>
    </div>
  );
}

function Panel({ title, lead, children }: { title: string; lead: string; children: React.ReactNode }) {
  return (
    <section className="rounded-panel border border-line bg-surface p-5">
      <h4 className="font-semibold">{title}</h4>
      <p className="mt-0.5 text-sm text-ink-soft">{lead}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** One bar per historical season: yield, coloured by whether that year made money. */
function HistoryChart({ members }: { members: Analysis["members"] }) {
  const { t } = useI18n();
  const data = members
    .filter((m) => m.year !== undefined)
    .sort((a, b) => a.year! - b.year!)
    .map((m) => ({
      year: String(m.year),
      yieldQ: Math.round(m.yieldKgHa * KG_HA_TO_Q_ACRE * 10) / 10,
      profit: m.netProfitPerAcreInr,
      drySpell: m.drySpellDays,
    }));
  const median = [...data].sort((a, b) => a.yieldQ - b.yieldQ)[Math.floor((data.length - 1) / 2)]?.yieldQ ?? 0;
  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -18 }}>
          <XAxis dataKey="year" tick={{ fontSize: 11, fill: "var(--color-ink-soft)" }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "var(--color-ink-soft)" }} tickLine={false} axisLine={false} width={44} unit=" q" />
          <Tooltip
            cursor={{ fill: "var(--color-mist)" }}
            contentStyle={{ borderRadius: 8, borderColor: "var(--color-line)", fontSize: 13 }}
            formatter={(value, name) =>
              name === "yieldQ" ? [`${value} ${t("common.quintalPerAcre")}`, t("sim.expectedYield")] : [String(value), String(name)]
            }
            labelFormatter={(label, payload) => {
              const p = payload?.[0]?.payload as (typeof data)[number] | undefined;
              return p ? `${label} · ${t("sim.netProfit")} ${inr(p.profit)} · ${p.drySpell} ${t("insights.dryDays")}` : String(label);
            }}
          />
          <ReferenceLine y={median} stroke="var(--color-ink-soft)" strokeDasharray="4 4" />
          <Bar dataKey="yieldQ" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.year} fill={d.profit < 0 ? "var(--color-alert)" : d.drySpell >= 14 ? "var(--color-sun)" : "var(--color-leaf)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
        <Swatch color="var(--color-leaf)" label={t("insights.goodYear")} />
        <Swatch color="var(--color-sun)" label={t("insights.dryYear")} />
        <Swatch color="var(--color-alert)" label={t("insights.lossYear")} />
      </p>
    </div>
  );
}

/** Supply (rain that soaked in + irrigation) against what the crop needed. */
function WaterBudget({ balance }: { balance: Analysis["waterBalance"] }) {
  const { t } = useI18n();
  const supply = balance.effectiveRainMm + balance.irrigationNetMm;
  const max = Math.max(balance.cropWaterNeedMm, supply, 1);
  const bar = (mm: number) => `${(mm / max) * 100}%`;
  return (
    <div className="space-y-4 text-sm">
      <div>
        <div className="mb-1 flex justify-between">
          <span className="text-ink-soft">{t("insights.need")}</span>
          <span className="font-semibold tabular">{num(balance.cropWaterNeedMm)} mm</span>
        </div>
        <div className="h-4 rounded bg-ink/5">
          <div className="h-full rounded bg-ink-faint/60" style={{ width: bar(balance.cropWaterNeedMm) }} />
        </div>
      </div>
      <div>
        <div className="mb-1 flex justify-between">
          <span className="text-ink-soft">{t("insights.supply")}</span>
          <span className="font-semibold tabular">{num(supply)} mm</span>
        </div>
        <div className="flex h-4 overflow-hidden rounded bg-ink/5">
          <div className="h-full bg-water/50" style={{ width: bar(balance.effectiveRainMm) }} title={t("sim.rain")} />
          <div className="h-full bg-water" style={{ width: bar(balance.irrigationNetMm) }} title={t("sim.waterUsed")} />
        </div>
        <p className="mt-1.5 flex flex-wrap gap-x-4 text-xs text-ink-soft">
          <Swatch color="color-mix(in srgb, var(--color-water) 50%, transparent)" label={`${t("sim.rain")} ${num(balance.effectiveRainMm)} mm`} />
          <Swatch color="var(--color-water)" label={`${t("sim.waterUsed")} ${num(balance.irrigationNetMm)} mm · ${balance.irrigationCount}×`} />
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-3 border-t border-line pt-3 text-xs">
        <div>
          <dt className="text-ink-soft">{t("insights.pumped")}</dt>
          <dd className="text-base font-semibold tabular">{num(balance.irrigationGrossMm)} mm</dd>
        </div>
        <div>
          <dt className="text-ink-soft">{t("insights.drained")}</dt>
          <dd className="text-base font-semibold tabular">{num(balance.drainageMm)} mm</dd>
        </div>
      </dl>
    </div>
  );
}

function YieldFactors({ factors }: { factors: Analysis["yieldFactors"] }) {
  const { t } = useI18n();
  const entries = Object.entries(factors) as [keyof Analysis["yieldFactors"], number][];
  return (
    <ul className="space-y-2.5 text-sm">
      {entries.map(([k, v]) => (
        <li key={k} className="grid grid-cols-[9.5rem_1fr_3rem] items-center gap-2">
          <span className="text-ink-soft">{t(`sim.factor.${k}`)}</span>
          <span className="h-2 rounded-full bg-ink/8">
            <span className={`block h-full rounded-full ${v >= 0.97 ? "bg-leaf" : v >= 0.8 ? "bg-sun" : "bg-alert"}`} style={{ width: `${v * 100}%` }} />
          </span>
          <span className="text-right tabular">{Math.round(v * 100)}%</span>
        </li>
      ))}
    </ul>
  );
}

function RegenFactors({ factors }: { factors: Analysis["regenerative"]["factors"] }) {
  return (
    <ul className="space-y-3 text-sm">
      {factors.map((f) => (
        <li key={f.key}>
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-medium">{f.label}</span>
            <span className="text-ink-soft tabular">
              {f.points}/{f.max}
            </span>
          </div>
          <div className="mt-1 flex h-2 gap-0.5">
            {Array.from({ length: f.max / 5 }, (_, i) => (
              <span key={i} className={`flex-1 rounded-sm ${i < Math.round(f.points / 5) ? "bg-soil" : "bg-soil-soft"}`} />
            ))}
          </div>
          <p className="mt-1 text-xs text-ink-soft">{f.note}</p>
        </li>
      ))}
    </ul>
  );
}

function Swatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block size-2.5 rounded-sm" style={{ background: color }} aria-hidden />
      {label}
    </span>
  );
}
