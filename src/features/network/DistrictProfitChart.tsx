"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { OutlookDistrict } from "@/contracts/network";
import type { CropCategory } from "@/contracts/simulation";
import { inr, inrShort } from "@/lib/format";
import { cropColor } from "./cropColors";

/** Typical-year profit of each district's best crop, sorted, coloured by that crop. */
export function DistrictProfitChart({
  districts,
  categoryOf,
  nameOf,
}: {
  districts: OutlookDistrict[];
  categoryOf: Record<string, CropCategory>;
  nameOf: Record<string, string>;
}) {
  const data = [...districts]
    .map((d) => ({ name: d.district, state: d.state, cropId: d.top[0]!.cropId, profit: d.top[0]!.profitP50, irrigation: d.top[0]!.irrigationMm }))
    .sort((a, b) => b.profit - a.profit);
  return (
    <div style={{ height: data.length * 18 + 40 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }} barCategoryGap={3}>
          <XAxis type="number" tickFormatter={inrShort} tick={{ fontSize: 11, fill: "var(--color-ink-soft)" }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" width={96} tick={{ fontSize: 11, fill: "var(--color-ink)" }} axisLine={false} tickLine={false} interval={0} />
          <Tooltip
            cursor={{ fill: "var(--color-mist)" }}
            contentStyle={{ borderRadius: 8, borderColor: "var(--color-line)", fontSize: 13 }}
            formatter={(value, _name, item) => [
              `${inr(Number(value))} · ${nameOf[item.payload.cropId] ?? item.payload.cropId} · ${Math.round(item.payload.irrigation)} mm`,
              item.payload.state,
            ]}
          />
          <Bar dataKey="profit" radius={[0, 4, 4, 0]} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={`${d.name}-${d.state}`} fill={cropColor(d.cropId, categoryOf[d.cropId])} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
