'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';

interface Row {
  id: string;
  hour: string;
  winRate: number;
  trades: number;
}

function Tip({ active, payload }: { active?: boolean; payload?: Array<{ payload: Row }> }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  const end = String((Number(p.hour) + 1) % 24).padStart(2, '0');
  return (
    <div className="rounded-lg border border-border bg-card p-3 text-xs shadow-xl">
      <p className="num mb-1 font-semibold text-foreground">{p.hour}:00–{end}:59 UTC</p>
      <p className="num text-muted-foreground">Win rate <span className="font-semibold text-foreground">{p.trades ? `${p.winRate}%` : '—'}</span></p>
      <p className="num text-muted-foreground">Trades <span className="font-semibold text-foreground">{p.trades}</span></p>
    </div>
  );
}

export default function HourlyChartClient({ data }: { data: Row[] }) {
  return (
    <ResponsiveContainer width="100%" height={230}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="hour" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 100]} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} tickLine={false} axisLine={false} width={36} tickFormatter={(v: number) => `${v}%`} />
        <Tooltip content={<Tip />} cursor={{ fill: 'var(--secondary)' }} />
        <ReferenceLine y={50} stroke="var(--warning)" strokeDasharray="4 4" />
        <Bar dataKey="winRate" radius={[4, 4, 0, 0]} isAnimationActive={false}>
          {data.map((h) => (
            <Cell
              key={`cell-${h.id}`}
              fill={h.winRate >= 65 ? 'var(--success)' : h.winRate >= 50 ? 'var(--primary)' : 'var(--destructive)'}
              fillOpacity={h.trades === 0 ? 0.15 : h.winRate >= 50 ? 1 : 0.75}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}