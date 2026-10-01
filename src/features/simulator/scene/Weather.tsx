/** Weather effects over the field: rain, heat shimmer and frost. */
import { useMemo } from "react";

interface WeatherProps {
  width: number;
  groundY: number;
  horizonY: number;
  rainMm: number;
  tMax: number;
  tMin: number;
  heatStress: number;
}

export function Weather({ width, groundY, horizonY, rainMm, tMax, tMin, heatStress }: WeatherProps) {
  const drops = useMemo(() => {
    if (rainMm < 0.5) return [];
    const n = rainMm < 5 ? 40 : rainMm < 25 ? 90 : 150;
    return Array.from({ length: n }, (_, i) => ({ x: (i * 53.3) % width, y: (i * 97.1) % groundY, len: rainMm > 25 ? 22 : 14 }));
  }, [rainMm, width, groundY]);

  const hot = tMax >= 35 || heatStress > 0.25;
  const frost = tMin <= 3;

  return (
    <g pointerEvents="none">
      {drops.length ? (
        <g stroke="#dfeef8" strokeWidth={rainMm > 25 ? 1.6 : 1.1} strokeLinecap="round" opacity="0.8">
          {drops.map((d, i) => (
            <line key={i} x1={d.x} y1={d.y} x2={d.x - 4} y2={d.y + d.len}>
              <animateTransform
                attributeName="transform"
                type="translate"
                values={`0 -30; -6 ${groundY * 0.25}`}
                dur={`${0.7 + (i % 5) * 0.08}s`}
                repeatCount="indefinite"
              />
            </line>
          ))}
        </g>
      ) : null}

      {hot ? (
        <g stroke="#fff3d6" strokeWidth="1.2" fill="none" opacity="0.45">
          {[0, 1, 2].map((i) => (
            <path key={i} d={`M0 ${horizonY + 20 + i * 18} q40 -6 80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0`}>
              <animateTransform attributeName="transform" type="translate" values="0 0; -40 0; 0 0" dur={`${3 + i}s`} repeatCount="indefinite" />
            </path>
          ))}
        </g>
      ) : null}

      {frost ? (
        <g>
          <rect width={width} height={groundY} fill="#dbeaf5" opacity="0.18" />
          {Array.from({ length: 60 }, (_, i) => (
            <circle key={i} cx={(i * 71.7) % width} cy={horizonY + ((i * 37.3) % (groundY - horizonY))} r="1.1" fill="#ffffff" opacity="0.85" />
          ))}
        </g>
      ) : null}
    </g>
  );
}
