"use client";

import type { SimulationResult } from "@/contracts/simulation";
import { FieldScene } from "@/features/simulator/scene/FieldScene";
import { useI18n } from "@/i18n/client";

/** The landing hero: a real simulated field on its most striking day (full bloom). */
export function HeroField({ simulation, caption }: { simulation: SimulationResult; caption: string }) {
  const { t } = useI18n();
  const bloom = simulation.stages.find((s) => s.key === "mid");
  const dayIndex = bloom ? bloom.startDay + Math.round((bloom.endDay - bloom.startDay) * 0.3) : Math.floor(simulation.days.length / 2);
  const day = simulation.days[dayIndex]!;
  return (
    <figure>
      <div className="overflow-hidden rounded-panel border border-line shadow-[0_24px_60px_-30px_rgb(21_34_61/0.45)]">
        <FieldScene
          crop={simulation.crop}
          day={day}
          stage={bloom}
          title={caption}
          labels={{ rootZoneWater: t("simulator.rootZoneWater"), depthTop: t("simulator.depthTop"), depthMid: t("simulator.depthMid") }}
        />
      </div>
      <figcaption className="mt-3 text-sm text-ink-soft">{caption}</figcaption>
    </figure>
  );
}
