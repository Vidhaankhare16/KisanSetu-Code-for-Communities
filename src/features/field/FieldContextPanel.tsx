"use client";

import { useEffect, useState } from "react";
import { Cloud, CloudDrizzle, CloudRain, CloudSun, Droplets, Layers, Satellite, Sun } from "lucide-react";
import type { FieldContextResponse } from "@/contracts/api";
import type { Place } from "@/contracts/farm";
import { useI18n } from "@/i18n/client";
import { api } from "@/lib/api";
import { shortDate } from "@/lib/format";

/** What open data says about the field right now: forecast, soil and satellite greenness. */
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
  const now = ctx.forecast?.current;
  const veg = ctx.vegetation;

  return (
    <section aria-label={t("context.title")} className="space-y-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-ink-soft">{t("context.title")}</h2>
        {now?.temperatureC != null ? (
          <span className="text-sm tabular">
            {Math.round(now.temperatureC)}°C{now.humidityPct != null ? ` · ${Math.round(now.humidityPct)}% RH` : ""}
          </span>
        ) : null}
      </div>

      {days.length ? (
        <div>
          <p className="mb-1.5 flex justify-between text-xs text-ink-soft">
            <span>{t("context.rainNext16")}</span>
            <span className="font-semibold text-water tabular">{Math.round(days.reduce((a, d) => a + d.rain, 0))} mm</span>
          </p>
          <ForecastStrip days={days} />
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-xs text-ink-soft">
            <Layers className="size-3.5 text-soil" aria-hidden />
            {t("context.soil")}
          </p>
          <p className="text-sm font-medium">{t(`soilTexture.${ctx.soil.texture}`)}</p>
          {ctx.soil.profile ? <TextureTriangle sand={ctx.soil.profile.sandPct} clay={ctx.soil.profile.clayPct} /> : null}
          <p className="text-xs text-ink-faint">{t(`context.soilSource.${ctx.soil.source}`)}</p>
          {ctx.soil.profile ? (
            <p className="text-xs text-ink-soft tabular">
              pH {ctx.soil.profile.pH} · OC {ctx.soil.profile.organicCarbonPct}%
            </p>
          ) : null}
        </div>
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-xs text-ink-soft">
            <Satellite className="size-3.5 text-leaf" aria-hidden />
            {t("context.satellite")}
          </p>
          {veg?.latest ? (
            <>
              <p className="text-sm font-medium tabular">
                {veg.latest.ndvi.toFixed(2)} <span className="font-normal text-ink-soft">{t(`context.cover.${veg.cover}`)}</span>
              </p>
              <NdviSparkline series={veg.series} />
              {veg.yearAgo ? <p className="text-xs text-ink-faint">{t("context.yearAgo", { value: veg.yearAgo.ndvi.toFixed(2) })}</p> : null}
            </>
          ) : (
            <p className="text-xs text-ink-faint">—</p>
          )}
        </div>
      </div>

      {ctx.forecast?.rootZoneSoilMoisture != null ? (
        <div>
          <p className="mb-1 flex items-center justify-between text-xs text-ink-soft">
            <span className="flex items-center gap-1.5">
              <Droplets className="size-3.5 text-water" aria-hidden />
              {t("context.moisture")}
            </span>
            <span className="tabular">{Math.round(ctx.forecast.rootZoneSoilMoisture * 100)}% vol.</span>
          </p>
          <div className="h-2 rounded-full bg-water-soft">
            <div className="h-full rounded-full bg-water" style={{ width: `${Math.min(100, (ctx.forecast.rootZoneSoilMoisture / 0.45) * 100)}%` }} />
          </div>
        </div>
      ) : null}
    </section>
  );
}

type Day = NonNullable<FieldContextResponse["forecast"]>["days"][number];

function WeatherIcon({ day }: { day: Day }) {
  const chance = day.rainProbabilityPct ?? 0;
  const cls = "mx-auto size-4";
  if (day.rain >= 10) return <CloudRain className={`${cls} text-water`} aria-hidden />;
  if (day.rain >= 1) return <CloudDrizzle className={`${cls} text-water`} aria-hidden />;
  if (chance >= 40) return <Cloud className={`${cls} text-ink-faint`} aria-hidden />;
  if (chance >= 15) return <CloudSun className={`${cls} text-sun`} aria-hidden />;
  return <Sun className={`${cls} text-sun`} aria-hidden />;
}

/** Sixteen days: sky icon, day high, and a rain bar. */
function ForecastStrip({ days }: { days: Day[] }) {
  const { lang } = useI18n();
  const maxRain = Math.max(10, ...days.map((d) => d.rain));
  return (
    <ol className="grid grid-cols-8 gap-x-1 gap-y-2 sm:grid-cols-16 lg:grid-cols-8">
      {days.map((d, i) => (
        <li key={d.date} className="text-center" title={`${shortDate(d.date, lang)}: ${Math.round(d.tMin)}–${Math.round(d.tMax)}°C, ${d.rain.toFixed(1)} mm`}>
          <span className="block text-[10px] text-ink-faint">{i === 0 ? "•" : shortDate(d.date, lang).split(" ")[0]}</span>
          <WeatherIcon day={d} />
          <span className="block text-[11px] tabular">{Math.round(d.tMax)}°</span>
          <span className="mx-auto mt-0.5 flex h-5 w-2 items-end rounded-sm bg-water-soft">
            <span className="block w-full rounded-sm bg-water" style={{ height: `${Math.min(100, (d.rain / maxRain) * 100)}%` }} />
          </span>
        </li>
      ))}
    </ol>
  );
}

/** USDA texture triangle with the field's sand/clay plotted (silt is the remainder). */
function TextureTriangle({ sand, clay }: { sand: number; clay: number }) {
  // Equilateral triangle: bottom-left = 100% sand, bottom-right = 100% silt, top = 100% clay.
  const A = { x: 8, y: 66 };
  const B = { x: 92, y: 66 };
  const C = { x: 50, y: 6 };
  const silt = Math.max(0, 100 - sand - clay);
  const p = {
    x: (sand * A.x + silt * B.x + clay * C.x) / 100,
    y: (sand * A.y + silt * B.y + clay * C.y) / 100,
  };
  return (
    <svg viewBox="0 0 100 78" className="my-1 w-28" role="img" aria-label={`Sand ${sand}%, silt ${Math.round(silt)}%, clay ${clay}%`}>
      <path d={`M${A.x} ${A.y} L${B.x} ${B.y} L${C.x} ${C.y} Z`} fill="var(--color-soil-soft)" stroke="var(--color-soil)" strokeWidth="0.8" />
      {[0.25, 0.5, 0.75].map((f) => (
        <line
          key={f}
          x1={A.x + (C.x - A.x) * f}
          y1={A.y + (C.y - A.y) * f}
          x2={B.x + (C.x - B.x) * f}
          y2={B.y + (C.y - B.y) * f}
          stroke="var(--color-soil)"
          strokeOpacity="0.25"
          strokeWidth="0.6"
        />
      ))}
      <circle cx={p.x} cy={p.y} r="3.4" fill="var(--color-soil)" stroke="#fff" strokeWidth="1.2" />
      <text x={A.x} y="76" fontSize="7" fill="var(--color-ink-soft)">
        sand
      </text>
      <text x={B.x} y="76" fontSize="7" textAnchor="end" fill="var(--color-ink-soft)">
        silt
      </text>
      <text x={C.x + 4} y={C.y + 2} fontSize="7" fill="var(--color-ink-soft)">
        clay
      </text>
    </svg>
  );
}

/** Thirteen months of MODIS NDVI: the green-up and harvest cycles of the surrounding land. */
function NdviSparkline({ series }: { series: { date: string; ndvi: number }[] }) {
  if (series.length < 2) return null;
  const W = 120;
  const H = 40;
  const x = (i: number) => (i / (series.length - 1)) * W;
  const y = (v: number) => H - Math.max(0, Math.min(1, v / 0.9)) * (H - 4) - 2;
  const line = series.map((p, i) => `${x(i)},${y(p.ndvi)}`).join(" L");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="my-1 w-32" aria-hidden>
      <path d={`M0 ${H} L${line} L${W} ${H} Z`} fill="var(--color-leaf-soft)" />
      <path d={`M${line}`} fill="none" stroke="var(--color-leaf)" strokeWidth="1.6" />
      <circle cx={x(series.length - 1)} cy={y(series.at(-1)!.ndvi)} r="2.6" fill="var(--color-leaf-deep)" />
    </svg>
  );
}

function ContextSkeleton() {
  return (
    <div className="grid animate-pulse gap-4" aria-hidden>
      <div className="h-16 rounded bg-ink/5" />
      <div className="grid grid-cols-2 gap-4">
        <div className="h-24 rounded bg-ink/5" />
        <div className="h-24 rounded bg-ink/5" />
      </div>
    </div>
  );
}
