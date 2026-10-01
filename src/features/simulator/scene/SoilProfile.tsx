/**
 * Cut-away of the soil under the front row: moist soil darkens, the wetting front shows how
 * deep the water reaches, and roots grow down as the crop develops.
 */
import { soilColors } from "./palette";

interface SoilProfileProps {
  width: number;
  top: number;
  depth: number;
  moisturePct: number;
  /** Root depth as a fraction of the profile depth, 0..1. */
  rootFraction: number;
  rootXs: number[];
  irrigated: boolean;
  labels: { moisture: string; depthTop: string; depthMid: string };
}

export function SoilProfile({ width, top, depth, moisturePct, rootFraction, rootXs, irrigated, labels }: SoilProfileProps) {
  const soil = soilColors(moisturePct);
  const wetDepth = depth * (0.15 + 0.8 * (moisturePct / 100));
  const rootLen = Math.max(8, depth * rootFraction);
  return (
    <g>
      <defs>
        <linearGradient id="scene-soil" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={soil.topsoil} />
          <stop offset="1" stopColor={soil.subsoil} />
        </linearGradient>
        <linearGradient id="scene-wet" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={soil.wet} stopOpacity="0.55" />
          <stop offset="0.85" stopColor={soil.wet} stopOpacity="0.35" />
          <stop offset="1" stopColor={soil.wet} stopOpacity="0" />
        </linearGradient>
        <pattern id="scene-grain" width="14" height="10" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="3" r="0.9" fill="#000" opacity="0.08" />
          <circle cx="10" cy="7" r="0.7" fill="#fff" opacity="0.08" />
        </pattern>
      </defs>
      <rect x="0" y={top} width={width} height={depth} fill="url(#scene-soil)" />
      <rect x="0" y={top} width={width} height={wetDepth} fill="url(#scene-wet)" />
      {irrigated ? (
        <rect x="0" y={top} width={width} height={wetDepth} fill="var(--color-water)" opacity="0.12">
          <animate attributeName="opacity" values="0.05;0.2;0.05" dur="2.4s" repeatCount="indefinite" />
        </rect>
      ) : null}
      <rect x="0" y={top} width={width} height={depth} fill="url(#scene-grain)" />
      <line x1="0" x2={width} y1={top + wetDepth} y2={top + wetDepth} stroke="var(--color-water)" strokeWidth="1.2" strokeDasharray="5 6" opacity="0.7" />

      {rootXs.map((x, i) => (
        <g key={i} stroke="#e8d5b5" strokeLinecap="round" fill="none" opacity="0.85">
          <path d={`M${x} ${top} q2 ${rootLen * 0.5} 0 ${rootLen}`} strokeWidth="1.6" />
          {rootFraction > 0.15 ? (
            <>
              <path
                d={`M${x} ${top + rootLen * 0.3} q${-10 * rootFraction - 4} ${rootLen * 0.15} ${-16 * rootFraction - 6} ${rootLen * 0.4}`}
                strokeWidth="0.9"
              />
              <path
                d={`M${x} ${top + rootLen * 0.45} q${10 * rootFraction + 4} ${rootLen * 0.15} ${16 * rootFraction + 6} ${rootLen * 0.4}`}
                strokeWidth="0.9"
              />
            </>
          ) : null}
        </g>
      ))}

      <g fontSize="11" fill="#fdf6ea" opacity="0.92">
        <text x={width - 10} y={top + 16} textAnchor="end">
          {labels.depthTop}
        </text>
        <text x={width - 10} y={top + depth * 0.55} textAnchor="end">
          {labels.depthMid}
        </text>
      </g>
      <g transform={`translate(12 ${top + depth - 14})`}>
        <rect x="0" y="-13" width={labels.moisture.length * 6.2 + 46} height="20" rx="10" fill="#1d2a3f" opacity="0.55" />
        <text x="10" y="1" fontSize="12" fill="#fff">
          {labels.moisture}: <tspan fontWeight="600">{Math.round(moisturePct)}%</tspan>
        </text>
      </g>
    </g>
  );
}
