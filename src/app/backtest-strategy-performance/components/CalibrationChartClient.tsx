'use client';

import React from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Row {
  id: string;
  bucket: string;
  winRate: number;
  trades: number;
}

function Tip({ active, payload }: { active?: boolean; payload?: Array<{ payload: Row }> }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-card p-3 text-xs shadow-xl">
      <p className="num mb-1 font-semibold text-foreground">Confidence {p.bucket}</p>
      <p className="num text-muted-foreground">Win rate <span className="font-semibold text-foreground">{p.winRate}%</span></p>
      <p className="num text-muted-foreground">Trades <span className="font-semibold text-foreground">{p.trades}</span></p>
    </div>
  );
}

export default function CalibrationChartClient({ data }: { data: Row[] }) {
  return (
    <ResponsiveContainer width="100%" height={230}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="bucket" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis yAxisId="wr" domain={[0, 100]} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} tickLine={false} axisLine={false} width={36} tickFormatter={(v: number) => `${v}%`} />
        <YAxis yAxisId="tr" orientation="right" hide />
        <Tooltip content={<Tip />} cursor={{ fill: 'var(--secondary)' }} />
        <Bar yAxisId="tr" dataKey="trades" fill="var(--muted-foreground)" fillOpacity={0.35} radius={[4, 4, 0, 0]} barSize={34} isAnimationActive={false} />
        <Line yAxisId="wr" type="monotone" dataKey="winRate" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 4, fill: 'var(--primary)', stroke: 'var(--background)', strokeWidth: 2 }} isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}