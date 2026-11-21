'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import type { ModuleStat } from '@/lib/backtestEngine';

function Tip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ModuleStat }> }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-card p-3 text-xs shadow-xl">
      <p className="mb-1 font-semibold text-foreground">{p.module}</p>
      <p className="num text-muted-foreground">Win rate <span className="font-semibold text-foreground">{p.winRate}%</span></p>
      <p className="num text-muted-foreground">Profit factor <span className="font-semibold text-foreground">{p.profitFactor}</span></p>
      <p className="num text-muted-foreground">Trades <span className="font-semibold text-foreground">{p.trades}</span></p>
    </div>
  );
}

export default function ModuleCompareChartClient({ data }: { data: ModuleStat[] }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v}%`} />
        <YAxis type="category" dataKey="module" tick={{ fill: 'var(--foreground)', fontSize: 12 }} tickLine={false} axisLine={false} width={74} />
        <Tooltip content={<Tip />} cursor={{ fill: 'var(--secondary)' }} />
        <ReferenceLine x={50} stroke="var(--muted-foreground)" strokeDasharray="4 4" />
        <Bar dataKey="winRate" radius={[0, 6, 6, 0]} barSize={22} isAnimationActive={false}>
          {data.map((m) => (
            <Cell
              key={`cell-${m.id}`}
              fill={m.winRate >= 65 ? 'var(--success)' : m.winRate >= 50 ? 'var(--primary)' : 'var(--warning)'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}