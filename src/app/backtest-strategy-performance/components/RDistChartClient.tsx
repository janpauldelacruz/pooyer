'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Row {
  id: string;
  bucket: string;
  count: number;
  negative: boolean;
}

function Tip({ active, payload }: { active?: boolean; payload?: Array<{ payload: Row }> }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-card p-3 text-xs shadow-xl">
      <p className="num mb-1 font-semibold text-foreground">{p.bucket}</p>
      <p className="num text-muted-foreground">Trades <span className="font-semibold text-foreground">{p.count}</span></p>
    </div>
  );
}

export default function RDistChartClient({ data }: { data: Row[] }) {
  return (
    <ResponsiveContainer width="100%" height={230}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="bucket" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} tickLine={false} axisLine={false} interval={0} />
        <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} tickLine={false} axisLine={false} width={36} allowDecimals={false} />
        <Tooltip content={<Tip />} cursor={{ fill: 'var(--secondary)' }} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} isAnimationActive={false}>
          {data.map((r) => (
            <Cell key={`cell-${r.id}`} fill={r.negative ? 'var(--destructive)' : 'var(--success)'} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}