/** Sky, sun, clouds, distant hills and the village edge behind the field. */
import type { SkyPalette } from "./palette";

interface LandscapeProps {
  width: number;
  horizonY: number;
  sky: SkyPalette;
  rainMm: number;
  tMax: number;
}

export function Landscape({ width, horizonY, sky, rainMm, tMax }: LandscapeProps) {
  const cloudOpacity = rainMm > 1 ? 0.95 : 0.75;
  const cloudFill = rainMm > 10 ? "#9aa4ad" : rainMm > 1 ? "#d5dbe0" : "#ffffff";
  const sunR = 26 + Math.max(0, tMax - 25) * 0.8;
  return (
    <g>
      <defs>
        <linearGradient id="scene-sky" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={sky.top} />
          <stop offset="1" stopColor={sky.horizon} />
        </linearGradient>
        <radialGradient id="scene-sun">
          <stop offset="0.45" stopColor={sky.sun} />
          <stop offset="1" stopColor={sky.sunGlow} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={width} height={horizonY + 2} fill="url(#scene-sky)" />

      {rainMm < 8 ? (
        <g transform={`translate(${width * 0.82} 70)`}>
          <circle r={sunR * 2.4} fill="url(#scene-sun)" opacity="0.8" />
          <circle r={sunR * 0.75} fill={sky.sun} />
        </g>
      ) : null}

      <g fill={cloudFill} opacity={cloudOpacity}>
        <Cloud x={120} y={62} s={1} />
        <Cloud x={430} y={44} s={0.8} />
        {rainMm > 0.5 ? <Cloud x={640} y={70} s={1.2} /> : null}
        {rainMm > 5 ? <Cloud x={860} y={52} s={1.1} /> : null}
        {rainMm > 5 ? <Cloud x={280} y={90} s={1.3} /> : null}
      </g>

      {/* Hazy distant hills */}
      <path
        d={`M0 ${horizonY - 38} Q${width * 0.18} ${horizonY - 70} ${width * 0.36} ${horizonY - 44} T${width * 0.72} ${horizonY - 52} T${width} ${horizonY - 40} V${horizonY} H0 Z`}
        fill={sky.hills}
        opacity="0.85"
      />
      <rect y={horizonY - 60} width={width} height="60" fill={sky.horizon} opacity={sky.haze} />

      {/* Village edge: tree line, a farmhouse and a well-side neem */}
      <g fill={sky.treeLine}>
        {TREES.map((t, i) => (
          <g key={i} transform={`translate(${t.x * width} ${horizonY - 2})`}>
            <rect x="-1.5" y={-t.h * 0.45} width="3" height={t.h * 0.45} fill="#6d5a42" />
            <ellipse cx="0" cy={-t.h * 0.6} rx={t.w} ry={t.h * 0.4} />
            <ellipse cx={t.w * 0.45} cy={-t.h * 0.72} rx={t.w * 0.65} ry={t.h * 0.3} opacity="0.85" />
          </g>
        ))}
      </g>
      <Farmhouse x={width * 0.12} y={horizonY - 1} />
    </g>
  );
}

const TREES = [
  { x: 0.03, w: 16, h: 30 },
  { x: 0.22, w: 12, h: 24 },
  { x: 0.27, w: 18, h: 34 },
  { x: 0.46, w: 10, h: 20 },
  { x: 0.58, w: 20, h: 36 },
  { x: 0.63, w: 12, h: 24 },
  { x: 0.78, w: 14, h: 26 },
  { x: 0.95, w: 18, h: 32 },
];

function Cloud({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="0" rx="34" ry="13" />
      <ellipse cx="-16" cy="-8" rx="18" ry="14" />
      <ellipse cx="12" cy="-12" rx="20" ry="16" />
    </g>
  );
}

/** A small khaprail-roofed farmhouse with a cattle shed. */
function Farmhouse({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="-22" y="-20" width="30" height="20" fill="#e7d8bd" />
      <path d="M-26 -19 L-7 -33 L12 -19 Z" fill="#a8553a" />
      <rect x="-12" y="-12" width="7" height="12" fill="#7a5a3a" />
      <rect x="10" y="-12" width="22" height="12" fill="#c9b48e" />
      <path d="M8 -12 L34 -12 L30 -18 L12 -18 Z" fill="#8a6a44" />
    </g>
  );
}
