"use client";

import { useEffect, useState } from "react";
import { CloudRain, Droplets, Layers, Satellite, Thermometer } from "lucide-react";
import type { FieldContextResponse } from "@/contracts/api";
import type { Place } from "@/contracts/farm";
import { useI18n } from "@/i18n/client";
import { api } from "@/lib/api";

/** What open data says about the field right now: weather, soil, satellite greenness. */
export function FieldContextPanel({ place, onLoaded }: { place: Place; onLoaded?: (ctx: FieldContextResponse) => void }) {
  const { t } = useI18n();
  const key = `${place.lat},${place.lon}`;
  // Results are stored with the place they belong to, so a stale answer is never shown.
  const [loaded, setLoaded] = useState<{ key: string; ctx: FieldContextResponse | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .context(place)
      .then((c) => {
        if (cancelled) return;
        setLoaded({ key, ctx: c });
        onLoaded?.(c);
      })
      .catch(() => !cancelled && setLoaded({ key, ctx: null }));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const current = loaded?.key === key ? loaded : null;
  if (!current) return <ContextSkeleton />;
  const ctx = current.ctx;
  if (!ctx) return <p className="text-sm text-ink-soft">{t("common.errorNetwork")}</p>;

  const days = ctx.forecast?.days ?? [];
  const rain16 = Math.round(days.reduce((a, d) => a + d.rain, 0));
  const now = ctx.forecast?.current;
  const ndvi = ctx.vegetation?.latest;

  return (
    <section aria-label={t("context.title")} className="space-y-4">
      <h2 className="text-sm font-medium text-ink-soft">{t("context.title")}</h2>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
        {now?.temperatureC != null ? (
          <Item icon={<Thermometer className="size-4 text-sun" />} label={t("context.weatherNow")}>
            {Math.round(now.temperatureC)}°C{now.humidityPct != null ? `, ${Math.round(now.humidityPct)}% RH` : ""}
          </Item>
        ) : null}
        <Item icon={<CloudRain className="size-4 text-water" />} label={t("context.rainNext16")}>
          {rain16} mm
          <RainSpark values={days.map((d) => d.rain)} />
        </Item>
        <Item icon={<Layers className="size-4 text-soil" />} label={t("context.soil")}>
          {t(`soilTexture.${ctx.soil.texture}`)}
          <span className="block text-xs text-ink-faint">{t(`context.soilSource.${ctx.soil.source}`)}</span>
          {ctx.soil.profile ? (
            <span className="block text-xs text-ink-soft">
              pH {ctx.soil.profile.pH} · OC {ctx.soil.profile.organicCarbonPct}%
            </span>
          ) : null}
        </Item>
        {ndvi ? (
          <Item icon={<Satellite className="size-4 text-leaf" />} label={t("context.satellite")}>
            {ndvi.ndvi.toFixed(2)} — {t(`context.cover.${ctx.vegetation!.cover}`)}
            {ctx.vegetation?.yearAgo ? (
              <span className="block text-xs text-ink-faint">{t("context.yearAgo", { value: ctx.vegetation.yearAgo.ndvi.toFixed(2) })}</span>
            ) : null}
          </Item>
        ) : null}
        {ctx.forecast?.rootZoneSoilMoisture != null ? (
          <Item icon={<Droplets className="size-4 text-water" />} label={t("context.moisture")}>
            {Math.round(ctx.forecast.rootZoneSoilMoisture * 100)}% vol.
          </Item>
        ) : null}
      </ul>
    </section>
  );
}

function Item({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="mt-0.5" aria-hidden>
        {icon}
      </span>
      <span>
        <span className="block text-xs text-ink-soft">{label}</span>
        <span className="font-medium text-ink tabular">{children}</span>
      </span>
    </li>
  );
}

function RainSpark({ values }: { values: number[] }) {
  const max = Math.max(5, ...values);
  return (
    <span className="mt-1 flex h-5 items-end gap-px" aria-hidden>
      {values.map((v, i) => (
        <span key={i} className="w-1 rounded-t-sm bg-water/80" style={{ height: `${Math.max(6, (v / max) * 100)}%`, opacity: v > 0.2 ? 1 : 0.2 }} />
      ))}
    </span>
  );
}

function ContextSkeleton() {
  return (
    <div className="grid animate-pulse grid-cols-2 gap-4" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-10 rounded bg-ink/5" />
      ))}
    </div>
  );
}
