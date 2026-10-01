"use client";

/**
 * The living field: a daylight view of the farm on the simulated day. Rows of the crop grow
 * from the model's height and canopy cover, change colour with stress and ripening, flower
 * and set produce by stage; rain, irrigation, heat and frost appear when the weather says so;
 * a soil cut-away shows moisture and roots.
 */
import { memo, useMemo } from "react";
import type { SimCrop, SimDay, SimLocation, SimStage } from "@/contracts/simulation";
import { plantTint, seeded } from "@/features/crops/art/color";
import { Plant } from "@/features/crops/art/Plant";
import { cropArt, type CropArt } from "@/features/crops/art/profiles";
import { Landscape } from "./Landscape";
import { skyPalette } from "./palette";
import { SoilProfile } from "./SoilProfile";
import { Weather } from "./Weather";

export interface FieldSceneLabels {
  rootZoneWater: string;
  depthTop: string;
  depthMid: string;
}

interface FieldSceneProps {
  crop: SimCrop;
  location?: SimLocation;
  day: SimDay;
  stage?: SimStage;
  labels: FieldSceneLabels;
  /** Pest or disease pressure on this day (drawn as insects on the front row). */
  pestPressure?: boolean;
  compact?: boolean;
  /** Accessible description of the picture, in the reader's language. */
  title?: string;
}

const W = 1000;
const HORIZON = 230;
/** Rows from the back of the field to the front: baseline, scale, plant count, detail. */
const ROWS = [
  { y: 262, scale: 0.42, count: 34, detail: "low" as const },
  { y: 292, scale: 0.56, count: 28, detail: "low" as const },
  { y: 330, scale: 0.74, count: 22, detail: "full" as const },
  { y: 378, scale: 1, count: 16, detail: "full" as const },
];
const FRONT = ROWS[ROWS.length - 1]!;
const SOIL_DEPTH = 132;
const PX_PER_CM = 1.05;

/** Typical maximum rooting depth by crop family, as a share of the 1.2 m soil cut-away. */
const ROOT_SHARE: Record<string, number> = { cereal: 0.85, millet: 0.9, pulse: 0.6, oilseed: 0.75, vegetable: 0.4, cash: 0.9, fodder: 0.8 };

export function FieldScene({ crop, day, stage, labels, pestPressure = false, compact = false, title }: FieldSceneProps) {
  const art = useMemo(() => cropArt(crop.id, crop.category), [crop.id, crop.category]);
  const stageProgress = stage ? Math.min(1, Math.max(0, (day.day - stage.startDay) / Math.max(1, stage.endDay - stage.startDay))) : 0;
  const ripening = day.stage === "late" ? stageProgress : 0;
  const sky = skyPalette(day.tMaxC, day.rainMm, ripening);
  const tint = plantTint(day.health, day.waterStress, day.stage, stageProgress);
  const frontHeight = Math.max(3, day.plantHeightCm * PX_PER_CM);
  const height = FRONT.y + SOIL_DEPTH;

  const frontXs = useMemo(() => xsFor(FRONT.count, 0), []);
  const rootShare = (ROOT_SHARE[crop.category] ?? 0.7) * Math.min(1, day.progress * 1.6 + 0.08);

  return (
    <svg
      viewBox={`0 ${compact ? 60 : 0} ${W} ${height - (compact ? 60 : 0)}`}
      className="block h-auto w-full select-none"
      role="img"
      aria-label={title ?? `${crop.name}, ${day.date}`}
    >
      <Landscape width={W} horizonY={HORIZON} sky={sky} rainMm={day.rainMm} tMax={day.tMaxC} />
      <FieldSurface irrigated={day.irrigationMm > 0} moisturePct={day.soilMoisturePct} />

      {ROWS.slice(0, -1).map((row, i) => (
        <Row
          key={i}
          art={art}
          y={row.y}
          scale={row.scale}
          count={row.count}
          offset={i * 0.37}
          h={frontHeight}
          cover={day.canopyCover}
          stageKey={day.stage}
          stageProgress={stageProgress}
          leaf={tint.leaf}
          leafDark={tint.leafDark}
          stem={tint.stem}
          detail={row.detail}
        />
      ))}

      <SoilProfile
        width={W}
        top={FRONT.y}
        depth={SOIL_DEPTH}
        moisturePct={day.soilMoisturePct}
        rootFraction={rootShare}
        rootXs={frontXs}
        irrigated={day.irrigationMm > 0}
        labels={{ moisture: labels.rootZoneWater, depthTop: labels.depthTop, depthMid: labels.depthMid }}
      />

      <Row
        art={art}
        y={FRONT.y}
        scale={1}
        count={FRONT.count}
        offset={0}
        h={frontHeight}
        cover={day.canopyCover}
        stageKey={day.stage}
        stageProgress={stageProgress}
        leaf={tint.leaf}
        leafDark={tint.leafDark}
        stem={tint.stem}
        detail="full"
        underground
      />

      {pestPressure ? <Insects xs={frontXs} y={FRONT.y} h={frontHeight} /> : null}
      <Weather width={W} groundY={FRONT.y} horizonY={HORIZON} rainMm={day.rainMm} tMax={day.tMaxC} tMin={day.tMinC} heatStress={day.heatStress} />
    </svg>
  );
}

function xsFor(count: number, offset: number): number[] {
  return Array.from({ length: count }, (_, i) => 40 + ((i + offset) / count) * (W - 40) + Math.sin(i * 12.9898) * 6);
}

interface RowProps {
  art: CropArt;
  y: number;
  scale: number;
  count: number;
  offset: number;
  h: number;
  cover: number;
  stageKey: SimDay["stage"];
  stageProgress: number;
  leaf: string;
  leafDark: string;
  stem: string;
  detail: "full" | "low";
  underground?: boolean;
}

/** How much of the plant's height is leafy canopy, by growth form. */
const CANOPY_SHARE: Record<CropArt["form"], number> = {
  grass: 0.62,
  brassica: 0.5,
  sunflower: 0.55,
  legume: 0.85,
  sesame: 0.6,
  cotton: 0.75,
  potato: 0.9,
  onion: 0.7,
  tomato: 0.75,
};

/** One crop row. Memoised: props are primitives, so unchanged days skip re-rendering. */
const Row = memo(function Row({ art, y, scale, count, offset, h, cover, stageKey, stageProgress, leaf, leafDark, stem, detail, underground }: RowProps) {
  const xs = xsFor(count, offset);
  // Quantise so a row only re-renders when the drawing would visibly change.
  const hq = Math.round(h);
  const cq = Math.round(cover * 20) / 20;
  const sq = Math.round(stageProgress * 10) / 10;
  return (
    <g>
      <Canopy
        art={art}
        y={y}
        scale={scale}
        h={hq}
        cover={cq}
        stageKey={stageKey}
        stageProgress={sq}
        leaf={leaf}
        leafDark={leafDark}
        seed={Math.round(offset * 100)}
      />
      {xs.map((x, i) => (
        <g key={i} transform={`translate(${x} ${y + (i % 2) * 1.5}) scale(${scale})`}>
          <Plant
            art={art}
            h={hq * (0.92 + ((i * 7) % 5) * 0.035)}
            cover={cq}
            stage={stageKey}
            stageProgress={sq}
            tint={{ leaf, leafDark, stem }}
            seed={i * 31 + Math.round(offset * 100)}
            detail={detail}
            showUnderground={underground}
          />
        </g>
      ))}
    </g>
  );
});

interface CanopyProps {
  art: CropArt;
  y: number;
  scale: number;
  h: number;
  cover: number;
  stageKey: SimDay["stage"];
  stageProgress: number;
  leaf: string;
  leafDark: string;
  seed: number;
}

/**
 * The crop mass along a row: overlapping leafy mounds whose height and density follow the
 * model's canopy cover, so a closed canopy reads as a closed field. Mustard in bloom gets its
 * yellow carpet; ripening cereals turn gold through the tint.
 */
function Canopy({ art, y, scale, h, cover, stageKey, stageProgress, leaf, leafDark, seed }: CanopyProps) {
  if (cover < 0.12 || h < 6) return null;
  const r = seeded(seed + 101);
  const step = 15 * scale;
  const n = Math.ceil(W / step) + 1;
  const height = h * scale * CANOPY_SHARE[art.form] * (0.45 + 0.55 * cover);
  const bloom = art.form === "brassica" && stageKey === "mid" && stageProgress < 0.8;
  const opacity = 0.55 + 0.45 * cover;
  // A continuous mass with a scalloped top edge: darker, taller back layer + lighter front layer.
  const scallop = (heightFactor: number, phase: number) => {
    let d = `M0 ${y} L0 ${y - height * heightFactor}`;
    for (let i = 0; i < n; i++) {
      const x0 = i * step;
      const bump = height * (0.12 + 0.18 * r());
      d += ` Q${x0 + step * (0.5 + phase)} ${y - height * heightFactor - bump} ${x0 + step} ${y - height * heightFactor * (0.92 + 0.12 * r())}`;
    }
    return `${d} L${W} ${y} Z`;
  };
  return (
    <g opacity={opacity}>
      <path d={scallop(1, 0.2)} fill={leafDark} />
      <path d={scallop(0.78, -0.2)} fill={leaf} />
      <g stroke={leafDark} strokeWidth={0.9 * scale + 0.3} strokeLinecap="round" opacity="0.55">
        {Array.from({ length: n * 2 }, (_, i) => {
          const x = (i / 2) * step + (r() - 0.5) * step;
          const yy = y - height * (0.15 + 0.55 * r());
          return <line key={`v${i}`} x1={x} y1={yy} x2={x + (r() - 0.5) * 6 * scale} y2={yy - 5 * scale - 2} />;
        })}
      </g>
      {bloom
        ? Array.from({ length: n * 3 }, (_, i) => (
            <circle
              key={`b${i}`}
              cx={(i / 3) * step + (r() - 0.5) * step}
              cy={y - height * (0.95 + 0.35 * r()) - h * scale * 0.25}
              r={2.6 * scale + 0.6}
              fill={art.flower}
            />
          ))
        : null}
    </g>
  );
}

/** Ploughed field between the horizon and the front row: ridges and furrows in perspective. */
function FieldSurface({ irrigated, moisturePct }: { irrigated: boolean; moisturePct: number }) {
  const dryToWet = Math.min(1, moisturePct / 100);
  const far = dryToWet > 0.6 ? "#a77f57" : "#bf9a6c";
  const near = dryToWet > 0.6 ? "#8a603d" : "#a7784c";
  const furrows = [244, 252, 262, 274, 288, 304, 322, 342, 364];
  return (
    <g>
      <defs>
        <linearGradient id="scene-field" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={far} />
          <stop offset="1" stopColor={near} />
        </linearGradient>
      </defs>
      <rect y={HORIZON} width={W} height={FRONT.y - HORIZON + 1} fill="url(#scene-field)" />
      {furrows.map((fy, i) => (
        <g key={fy}>
          <path
            d={`M0 ${fy} Q${W / 2} ${fy - 2 - i * 0.3} ${W} ${fy}`}
            stroke="#6f4a2c"
            strokeOpacity={0.22 + i * 0.03}
            strokeWidth={0.8 + i * 0.25}
            fill="none"
          />
          {irrigated ? (
            <path
              d={`M0 ${fy + 1} Q${W / 2} ${fy - 1 - i * 0.3} ${W} ${fy + 1}`}
              stroke="#7cc3ea"
              strokeOpacity="0.75"
              strokeWidth={0.8 + i * 0.3}
              strokeDasharray="18 10"
              fill="none"
            >
              <animate attributeName="stroke-dashoffset" values="0;-56" dur="1.6s" repeatCount="indefinite" />
            </path>
          ) : null}
        </g>
      ))}
      {/* Field bund (mendh) along the near edge */}
      <path d={`M0 ${FRONT.y - 2} Q${W / 2} ${FRONT.y - 6} ${W} ${FRONT.y - 2}`} stroke="#7b5536" strokeWidth="3" fill="none" opacity="0.35" />
    </g>
  );
}

function Insects({ xs, y, h }: { xs: number[]; y: number; h: number }) {
  return (
    <g fill="#2b2b2b">
      {xs.slice(2, 9).map((x, i) => (
        <g key={i}>
          <circle cx={x + 3} cy={y - h * 0.7 - (i % 3) * 3} r="1.4" />
          <circle cx={x - 2} cy={y - h * 0.62} r="1.1" />
          <circle cx={x + 1} cy={y - h * 0.82} r="1.2" />
        </g>
      ))}
    </g>
  );
}
