/**
 * Procedural crop illustrations. Each plant is drawn around its base at (0, 0), growing
 * upwards (negative y); produce that forms underground (tubers, groundnut pods) is drawn
 * below y = 0. Shapes respond to the crop model's height, canopy cover, stage and health,
 * so the picture is the data.
 */
import type { ReactNode } from "react";
import type { StageKey } from "@/contracts/simulation";
import { mix, seeded, type PlantTint } from "./color";
import type { CropArt, GrassHead } from "./profiles";

export interface PlantProps {
  art: CropArt;
  /** Above-ground height in px. */
  h: number;
  /** Canopy cover 0..1. */
  cover: number;
  stage: StageKey;
  /** Progress through the current stage, 0..1. */
  stageProgress: number;
  tint: PlantTint;
  seed: number;
  /** Draw tubers / pods below ground (front row only). */
  showUnderground?: boolean;
  /** Fewer leaves for distant rows and small icons. */
  detail?: "full" | "low";
  /**
   * Sway gently in the breeze. Off by default: any motion inside a large SVG repaints the whole
   * drawing every frame, so only small drawings (the close-up, header strips) should move.
   */
  sway?: boolean;
}

const range = (n: number) => Array.from({ length: Math.max(0, Math.round(n)) }, (_, i) => i);

interface Phase {
  flowering: boolean;
  fruiting: boolean;
  ripe: boolean;
}

function phase(stage: StageKey, stageProgress: number): Phase {
  return {
    flowering: stage === "mid" && stageProgress < 0.75,
    fruiting: (stage === "mid" && stageProgress > 0.35) || stage === "late",
    ripe: stage === "late",
  };
}

export function Plant(props: PlantProps) {
  const { art, showUnderground, sway = false } = props;
  const above = (() => {
    switch (art.form) {
      case "grass":
        return <Grass {...props} />;
      case "brassica":
        return <Brassica {...props} />;
      case "sunflower":
        return <Sunflower {...props} />;
      case "legume":
        return <Legume {...props} />;
      case "sesame":
        return <Sesame {...props} />;
      case "cotton":
        return <Cotton {...props} />;
      case "potato":
        return <Potato {...props} />;
      case "onion":
        return <Onion {...props} />;
      case "tomato":
        return <Tomato {...props} />;
    }
  })();
  return (
    <>
      <g className={sway ? "plant-sway" : undefined}>{above}</g>
      {showUnderground ? <Underground {...props} /> : null}
    </>
  );
}

// ------------------------------------------------------------------ grass family

function Grass({ art, h, cover, stage, stageProgress, tint, seed, detail = "full" }: PlantProps) {
  const r = seeded(seed);
  const { fruiting, ripe } = phase(stage, stageProgress);
  const showHead = stage === "mid" || stage === "late";
  const maize = art.head === "maize";
  const leaves = (detail === "low" ? 3 : 4) + Math.round(cover * (detail === "low" ? 2 : 4));
  const tillers = maize ? 1 : 1 + Math.round(cover * (detail === "low" ? 1 : 3));
  const spread = (maize ? 10 : 6) + cover * (maize ? 18 : 14);
  const headColor = ripe ? mix(art.fruit, art.ripe, 0.4 + stageProgress * 0.6) : fruiting ? art.fruit : art.flower;

  const leafEls = range(leaves).map((i) => {
    const dir = i % 2 ? 1 : -1;
    const L = Math.max(6, h * (maize ? 0.5 : 0.55) * (0.6 + 0.5 * r()));
    const base = maize ? -h * (0.12 + 0.6 * (i / leaves)) : 0;
    const w = spread * (0.55 + 0.6 * r());
    return (
      <path
        key={`l${i}`}
        d={`M0 ${base} Q${dir * w * 0.45} ${base - L * 0.75} ${dir * w} ${base - L * 0.45}`}
        stroke={i % 3 ? tint.leaf : tint.leafDark}
        strokeWidth={maize ? 3.2 : 2.1}
        strokeLinecap="round"
        fill="none"
      />
    );
  });

  const stems = range(tillers).map((t) => {
    const offset = tillers === 1 ? 0 : (t - (tillers - 1) / 2) * spread * 0.45;
    const lean = offset + (ripe && !maize ? 3 : 0);
    const topY = -h * (0.9 + 0.1 * r());
    return (
      <g key={`t${t}`}>
        <path d={`M0 0 Q${lean * 0.3} ${topY * 0.5} ${lean} ${topY}`} stroke={tint.stem} strokeWidth={maize ? 3 : 1.7} fill="none" strokeLinecap="round" />
        {showHead ? <g transform={`translate(${lean} ${topY})`}>{grassHead(art.head ?? "awned", headColor, ripe, lean, r)}</g> : null}
      </g>
    );
  });

  // Maize carries its cob on the stem, below the tassel.
  const cob =
    maize && fruiting ? (
      <g transform={`translate(2.5 ${-h * 0.5}) rotate(24)`}>
        <ellipse cx="2" cy="-7" rx="3.6" ry="8.5" fill={ripe ? "#d8c08a" : "#93b65a"} />
        {ripe ? (
          <ellipse cx="2.4" cy="-11" rx="2.4" ry="4.6" fill={art.ripe} />
        ) : (
          <path d="M2 -15 l-2 -5 M2 -15 l1 -6 M2 -15 l3 -4" stroke="#8a5a36" strokeWidth="0.8" />
        )}
      </g>
    ) : null;

  return (
    <g>
      {leafEls}
      {stems}
      {cob}
    </g>
  );
}

function grassHead(kind: GrassHead, color: string, ripe: boolean, lean: number, r: () => number): ReactNode {
  const tilt = lean * 1.2 + (ripe ? 14 : 0);
  switch (kind) {
    case "awned":
    case "awnedLong": {
      const awn = kind === "awnedLong" ? 16 : 10;
      return (
        <g transform={`rotate(${tilt})`}>
          {range(6).map((k) => {
            const side = k % 2 ? -1 : 1;
            const y = -k * 3.3 - 2;
            return (
              <g key={k}>
                <ellipse cx={side * 1.9} cy={y} rx="2.3" ry="1.6" fill={color} />
                <line x1={side * 2.4} y1={y} x2={side * 6.5} y2={y - awn} stroke={color} strokeWidth="0.6" />
              </g>
            );
          })}
        </g>
      );
    }
    case "drooping": {
      // Rice panicle: rises, then arches over with the weight of the grain.
      const bend = ripe ? 1 : 0.6;
      const p0 = { x: 0, y: 0 };
      const p1 = { x: 3, y: -12 };
      const p2 = { x: 12 * bend + 3, y: -4 + 8 * (1 - bend) };
      const at = (t: number) => ({
        x: (1 - t) ** 2 * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x,
        y: (1 - t) ** 2 * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y,
      });
      return (
        <g>
          <path d={`M0 0 Q${p1.x} ${p1.y} ${p2.x} ${p2.y}`} stroke={color} strokeWidth="0.9" fill="none" />
          {range(9).map((k) => {
            const p = at(0.3 + k * 0.08);
            return <ellipse key={k} cx={p.x + (k % 2 ? 1.2 : -1.2)} cy={p.y + 1} rx="1.4" ry="0.9" fill={color} />;
          })}
        </g>
      );
    }
    case "candle":
      return (
        <g transform={`rotate(${tilt * 0.5})`}>
          <rect x="-2.4" y="-17" width="4.8" height="17" rx="2.4" fill={color} />
          {range(5).map((k) => (
            <circle key={k} cx={k % 2 ? -0.9 : 0.9} cy={-3 - k * 3} r="0.6" fill={mix(color, "#000000", 0.25)} />
          ))}
        </g>
      );
    case "compact":
      return (
        <g transform={`rotate(${tilt * 0.4})`}>
          {range(10).map((k) => {
            const a = k * 2.4;
            const rad = 1.5 + (k % 4) * 0.9;
            return <circle key={k} cx={Math.cos(a) * rad} cy={-6 + Math.sin(a) * rad * 1.3} r={1.5} fill={color} />;
          })}
        </g>
      );
    case "fingers":
      return (
        <g>
          {range(5).map((k) => {
            const angle = -60 + k * 30 + (r() - 0.5) * 8;
            return (
              <path key={k} d="M0 0 q1 -5 0 -9 q-1 -2 -2 -3" transform={`rotate(${angle})`} stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
            );
          })}
        </g>
      );
    case "maize":
      return (
        <g>
          {range(5).map((k) => (
            <line key={k} x1="0" y1="0" x2={(k - 2) * 3} y2={-9 + Math.abs(k - 2)} stroke={ripe ? "#c9a96a" : "#d8c47a"} strokeWidth="0.9" />
          ))}
        </g>
      );
  }
}

// ------------------------------------------------------------------ mustard

function Brassica({ art, h, cover, stage, stageProgress, tint, seed, detail = "full" }: PlantProps) {
  const r = seeded(seed);
  const { flowering, fruiting, ripe } = phase(stage, stageProgress);
  const leafSpan = 6 + cover * 12;
  const basalLeaves = stage === "late" ? 0 : detail === "low" ? 2 : 4;
  const branches = h > 20 ? 3 + Math.round(cover * 2) : 0;
  const tips: { x: number; y: number }[] = [{ x: 0, y: -h }];

  const branchEls = range(branches).map((i) => {
    const dir = i % 2 ? 1 : -1;
    const y0 = -h * (0.35 + 0.1 * i);
    const tip = { x: dir * (leafSpan * 0.8 + r() * 6), y: -h * (0.68 + 0.07 * i) };
    tips.push(tip);
    return <path key={`b${i}`} d={`M0 ${y0} Q${tip.x * 0.4} ${y0 - 4} ${tip.x} ${tip.y}`} stroke={tint.stem} strokeWidth="1.4" fill="none" />;
  });

  return (
    <g>
      {range(basalLeaves).map((i) => {
        const dir = i % 2 ? 1 : -1;
        const L = Math.min(h * 0.45, 26) + 4;
        return (
          <ellipse
            key={`bl${i}`}
            cx={dir * leafSpan * 0.55}
            cy={-L * (0.35 + 0.1 * (i >> 1))}
            rx={leafSpan * 0.42}
            ry={Math.max(2, L * 0.16)}
            transform={`rotate(${dir * -38} ${dir * leafSpan * 0.55} ${-L * 0.35})`}
            fill={i % 2 ? tint.leaf : tint.leafDark}
          />
        );
      })}
      <path d={`M0 0 Q${r() * 3 - 1.5} ${-h * 0.5} 0 ${-h}`} stroke={tint.stem} strokeWidth="1.9" fill="none" />
      {branchEls}
      {tips.map((tp, i) => (
        <g key={`tip${i}`} transform={`translate(${tp.x} ${tp.y})`}>
          {flowering
            ? range(detail === "low" ? 5 : 9).map((k) => <circle key={k} cx={(k % 3) * 2.6 - 2.6} cy={-Math.floor(k / 3) * 2.6} r="2" fill={art.flower} />)
            : null}
          {fruiting && !flowering
            ? range(detail === "low" ? 3 : 6).map((k) => {
                const dir = k % 2 ? 1 : -1;
                return (
                  <line
                    key={k}
                    x1="0"
                    y1={k * 2.6}
                    x2={dir * 4.5}
                    y2={k * 2.6 - 5}
                    stroke={ripe ? art.ripe : art.fruit}
                    strokeWidth="1.1"
                    strokeLinecap="round"
                  />
                );
              })
            : null}
        </g>
      ))}
    </g>
  );
}

// ------------------------------------------------------------------ sunflower

function Sunflower({ art, h, cover, stage, stageProgress, tint, seed }: PlantProps) {
  const r = seeded(seed);
  const { flowering, ripe } = phase(stage, stageProgress);
  const leafSize = 4 + cover * 6;
  const top = { x: ripe ? 4 : 0, y: -h };
  return (
    <g>
      <path d={`M0 0 Q${r() * 2} ${-h * 0.55} ${top.x} ${top.y}`} stroke={tint.stem} strokeWidth="2.4" fill="none" />
      {range(Math.min(4, 1 + Math.floor(h / 25))).map((i) => {
        const y = -h * (0.18 + i * 0.2);
        return (
          <g key={i}>
            <ellipse cx={-leafSize} cy={y} rx={leafSize} ry={leafSize * 0.6} transform={`rotate(-20 ${-leafSize} ${y})`} fill={tint.leaf} />
            <ellipse cx={leafSize} cy={y - 4} rx={leafSize} ry={leafSize * 0.6} transform={`rotate(20 ${leafSize} ${y - 4})`} fill={tint.leafDark} />
          </g>
        );
      })}
      <g transform={`translate(${top.x} ${top.y}) rotate(${ripe ? 120 : flowering ? 15 : 0})`}>
        {stage === "development" && h > 25 ? <circle r="2.6" fill={tint.leafDark} /> : null}
        {flowering
          ? range(14).map((k) => (
              <ellipse
                key={k}
                cx={Math.cos((k / 14) * Math.PI * 2) * 6}
                cy={Math.sin((k / 14) * Math.PI * 2) * 6}
                rx="3"
                ry="1.3"
                transform={`rotate(${(k / 14) * 360} ${Math.cos((k / 14) * Math.PI * 2) * 6} ${Math.sin((k / 14) * Math.PI * 2) * 6})`}
                fill={art.flower}
              />
            ))
          : null}
        {stage === "mid" || ripe ? <circle r={ripe ? 5.5 : 4.8} fill={ripe ? art.ripe : art.fruit} /> : null}
      </g>
    </g>
  );
}

// ------------------------------------------------------------------ pulses & groundnut

function Legume({ art, h, cover, stage, stageProgress, tint, seed, detail = "full" }: PlantProps) {
  const r = seeded(seed);
  const { flowering, fruiting, ripe } = phase(stage, stageProgress);
  const width = (art.upright ? 8 : 8) + cover * (art.upright ? 24 : 22);
  const density = detail === "low" ? 0.5 : 1;
  const leaflets = Math.round((10 + cover * 26) * density * (ripe ? 0.55 : 1));
  const points = range(leaflets).map(() => ({
    x: (r() - 0.5) * width,
    y: -Math.max(2, h) * (0.15 + 0.85 * Math.sqrt(r())),
    a: r() * 180,
  }));
  const stems = Math.min(5, 2 + Math.round(cover * 3));
  return (
    <g>
      {range(stems).map((i) => {
        const x = (i / Math.max(1, stems - 1) - 0.5) * width * 0.7;
        return <path key={`s${i}`} d={`M0 0 Q${x * 0.3} ${-h * 0.4} ${x} ${-h * 0.9}`} stroke={tint.stem} strokeWidth="1.1" fill="none" />;
      })}
      {points.map((p, i) => (
        <ellipse key={`f${i}`} cx={p.x} cy={p.y} rx="2.3" ry="1.3" transform={`rotate(${p.a} ${p.x} ${p.y})`} fill={i % 3 ? tint.leaf : tint.leafDark} />
      ))}
      {flowering
        ? points.slice(0, Math.round(4 + cover * 6)).map((p, i) => <circle key={`fl${i}`} cx={p.x + 1.5} cy={p.y - 1} r="1.3" fill={art.flower} />)
        : null}
      {fruiting && art.underground !== "pods"
        ? points
            .slice(0, Math.round(5 + cover * 8))
            .map((p, i) => (
              <ellipse
                key={`p${i}`}
                cx={p.x - 1}
                cy={p.y + 1.5}
                rx="2.6"
                ry="0.9"
                transform={`rotate(${60 + (i % 3) * 25} ${p.x - 1} ${p.y + 1.5})`}
                fill={ripe ? art.ripe : art.fruit}
              />
            ))
        : null}
    </g>
  );
}

// ------------------------------------------------------------------ sesame

function Sesame({ art, h, cover, stage, stageProgress, tint }: PlantProps) {
  const { flowering, fruiting, ripe } = phase(stage, stageProgress);
  const nodes = Math.max(1, Math.floor(h / 10));
  const leafLen = 4 + cover * 4;
  return (
    <g>
      <line x1="0" y1="0" x2="0" y2={-h} stroke={tint.stem} strokeWidth="1.5" />
      {range(nodes).map((i) => {
        const y = -(i + 0.6) * (h / (nodes + 0.4));
        const upper = i >= nodes / 2;
        return (
          <g key={i}>
            <ellipse cx={-leafLen * 0.8} cy={y} rx={leafLen} ry="1.4" transform={`rotate(-30 ${-leafLen * 0.8} ${y})`} fill={tint.leaf} />
            <ellipse cx={leafLen * 0.8} cy={y - 2} rx={leafLen} ry="1.4" transform={`rotate(30 ${leafLen * 0.8} ${y - 2})`} fill={tint.leafDark} />
            {upper && flowering ? <ellipse cx="2.2" cy={y - 3} rx="1.2" ry="2.4" fill={art.flower} stroke="#c97fa1" strokeWidth="0.4" /> : null}
            {upper && fruiting && !flowering ? <rect x="1" y={y - 6} width="1.8" height="5" rx="0.8" fill={ripe ? art.ripe : art.fruit} /> : null}
          </g>
        );
      })}
    </g>
  );
}

// ------------------------------------------------------------------ cotton

function Cotton({ art, h, cover, stage, stageProgress, tint, seed }: PlantProps) {
  const r = seeded(seed);
  const { flowering, fruiting, ripe } = phase(stage, stageProgress);
  const span = 6 + cover * 16;
  const branches = range(2 + Math.round(cover * 3)).map((i) => {
    const dir = i % 2 ? 1 : -1;
    const y0 = -h * (0.3 + 0.12 * i);
    return { dir, y0, tip: { x: dir * span * (0.6 + 0.4 * r()), y: y0 - 8 - r() * 6 } };
  });
  const leafColor = ripe ? mix(tint.leaf, "#9c4a2e", 0.45) : tint.leaf;
  return (
    <g>
      <path d={`M0 0 L0 ${-h}`} stroke={tint.stem} strokeWidth="1.9" />
      {branches.map((b, i) => (
        <g key={i}>
          <path d={`M0 ${b.y0} Q${b.tip.x * 0.5} ${b.y0 - 2} ${b.tip.x} ${b.tip.y}`} stroke={tint.stem} strokeWidth="1.2" fill="none" />
          <circle cx={b.tip.x * 0.55} cy={b.y0 - 3} r={2.4 + cover * 1.6} fill={leafColor} />
          <circle cx={b.tip.x * 0.55 + b.dir * 2} cy={b.y0 - 5} r={2 + cover * 1.4} fill={tint.leafDark} />
          {flowering ? <circle cx={b.tip.x} cy={b.tip.y} r="2.2" fill={art.flower} stroke="#e4c96a" strokeWidth="0.5" /> : null}
          {fruiting && !ripe ? <circle cx={b.tip.x} cy={b.tip.y + 3} r="1.8" fill={art.fruit} /> : null}
          {ripe ? (
            <g transform={`translate(${b.tip.x} ${b.tip.y})`}>
              <circle cx="-1.6" cy="0" r="2" fill={art.ripe} stroke="#d9d4c4" strokeWidth="0.4" />
              <circle cx="1.6" cy="0" r="2" fill={art.ripe} stroke="#d9d4c4" strokeWidth="0.4" />
              <circle cx="0" cy="-1.8" r="2" fill={art.ripe} stroke="#d9d4c4" strokeWidth="0.4" />
            </g>
          ) : null}
        </g>
      ))}
      <circle cx="0" cy={-h} r={2 + cover * 2} fill={tint.leafDark} />
    </g>
  );
}

// ------------------------------------------------------------------ vegetables

function Potato({ art, h, cover, stage, stageProgress, tint, seed }: PlantProps) {
  const r = seeded(seed);
  const { flowering } = phase(stage, stageProgress);
  const width = 8 + cover * 22;
  const thin = stage === "late" ? 0.5 : 1;
  return (
    <g>
      {range(Math.round((12 + cover * 22) * thin)).map((i) => {
        const x = (r() - 0.5) * width;
        const y = -Math.max(3, h) * (0.2 + 0.8 * r()) * (1 - Math.abs(x) / width);
        return <ellipse key={i} cx={x} cy={y} rx="3.4" ry="2" transform={`rotate(${r() * 180} ${x} ${y})`} fill={i % 3 ? tint.leaf : tint.leafDark} />;
      })}
      {flowering
        ? range(3).map((k) => <circle key={`fl${k}`} cx={(k - 1) * 4} cy={-h - 1} r="1.5" fill={art.flower} stroke="#c8b8e0" strokeWidth="0.4" />)
        : null}
    </g>
  );
}

function Onion({ art, h, cover, stage, stageProgress, tint, seed }: PlantProps) {
  const r = seeded(seed);
  const { ripe } = phase(stage, stageProgress);
  const bulb = stage === "initial" ? 1.5 : 2 + Math.min(1, stage === "development" ? 0.3 : stage === "mid" ? 0.5 + stageProgress * 0.4 : 1) * 6;
  return (
    <g>
      {range(4 + Math.round(cover * 3)).map((i) => {
        const dir = (i - 2.5) * 1.6;
        const L = h * (0.7 + 0.3 * r());
        // Ripe onions "lodge": the tops fall over and dry.
        const d = ripe
          ? `M0 ${-bulb} Q${dir * 2} ${-L * 0.45} ${dir * 6 + (i % 2 ? 10 : -10)} ${-L * 0.25}`
          : `M0 ${-bulb} Q${dir} ${-L * 0.5} ${dir * 2.4} ${-L}`;
        return <path key={i} d={d} stroke={i % 2 ? tint.leaf : tint.leafDark} strokeWidth="2.2" strokeLinecap="round" fill="none" />;
      })}
      <ellipse cx="0" cy={-bulb * 0.6} rx={bulb * 0.9} ry={bulb * 0.75} fill={ripe ? art.ripe : art.fruit} />
    </g>
  );
}

function Tomato({ art, h, cover, stage, stageProgress, tint, seed }: PlantProps) {
  const r = seeded(seed);
  const { flowering, fruiting, ripe } = phase(stage, stageProgress);
  const nodes = Math.max(1, Math.floor(h / 9));
  const leaf = 2.6 + cover * 2.6;
  return (
    <g>
      {h > 22 ? <line x1="3" y1="2" x2="3" y2={-h - 6} stroke="#9b7b53" strokeWidth="1.3" /> : null}
      <path
        d={`M0 0 ${range(nodes)
          .map((i) => `L${i % 2 ? 2 : -1} ${-(i + 1) * (h / nodes)}`)
          .join(" ")}`}
        stroke={tint.stem}
        strokeWidth="1.5"
        fill="none"
      />
      {range(nodes).map((i) => {
        const y = -(i + 0.5) * (h / nodes);
        const dir = i % 2 ? 1 : -1;
        return (
          <g key={i}>
            <ellipse cx={dir * (leaf + 1)} cy={y} rx={leaf} ry={leaf * 0.6} fill={tint.leaf} />
            <ellipse cx={dir * (leaf * 2 + 1)} cy={y + 1.5} rx={leaf * 0.8} ry={leaf * 0.5} fill={tint.leafDark} />
            {flowering && i >= nodes / 2 ? <circle cx={-dir * 2.5} cy={y - 1} r="1.3" fill={art.flower} /> : null}
            {fruiting && i < nodes - 1 && i >= nodes / 3 ? (
              <circle cx={-dir * 3} cy={y + 2} r="2.3" fill={ripe ? (r() > 0.25 ? art.ripe : "#ef8a2f") : art.fruit} />
            ) : null}
          </g>
        );
      })}
    </g>
  );
}

// ------------------------------------------------------------------ underground produce

function Underground({ art, stage, stageProgress, seed }: PlantProps) {
  if (!art.underground) return null;
  const r = seeded(seed + 7);
  const growth = stage === "initial" ? 0 : stage === "development" ? 0.2 : stage === "mid" ? 0.35 + stageProgress * 0.45 : 0.85 + stageProgress * 0.15;
  if (growth <= 0) return null;
  const count = art.underground === "tubers" ? 4 : 6;
  return (
    <g>
      {range(count).map((i) => {
        const x = (i - (count - 1) / 2) * 6 + (r() - 0.5) * 4;
        const y = 10 + r() * 12;
        if (art.underground === "pods") {
          // Groundnut flowers above ground, then pegs push down into the soil where pods swell.
          return (
            <g key={i}>
              <path d={`M0 -2 Q${x * 0.5} ${y * 0.2} ${x} ${y}`} stroke="#a77a4a" strokeWidth="0.6" fill="none" />
              <g transform={`translate(${x} ${y}) rotate(${r() * 60 - 30})`}>
                <ellipse cx="-1.6" cy="0" rx={1.8 * growth + 0.6} ry={1.3 * growth + 0.5} fill={art.ripe} stroke="#8a6a3e" strokeWidth="0.4" />
                <ellipse cx="1.6" cy="0" rx={1.8 * growth + 0.6} ry={1.3 * growth + 0.5} fill={art.ripe} stroke="#8a6a3e" strokeWidth="0.4" />
              </g>
            </g>
          );
        }
        return <ellipse key={i} cx={x} cy={y} rx={2 + 4.5 * growth} ry={1.5 + 3 * growth} fill={art.ripe} stroke="#9c7444" strokeWidth="0.6" />;
      })}
    </g>
  );
}
