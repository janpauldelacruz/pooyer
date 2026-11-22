'use client';

import React from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { EquityPoint } from '@/lib/types';

interface TipProps {
  active?: boolean;
  payload?: Array<{ payload: EquityPoint }>;
}

function Tip({ active, payload }: TipProps) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-card p-3 text-xs shadow-xl">
      <p className="num mb-1 font-semibold text-foreground">{p.label}</p>
      <p className="num text-muted-foreground">
        Equity <span className="font-semibold text-primary">{p.equity.toFixed(2)}</span>
      </p>
      <p className="num text-muted-foreground">
        Drawdown <span className="font-semibold text-destructive">{p.drawdown.toFixed(2)}%</span>
      </p>
    </div>
  );
}

export default function EquityChartClient({ data }: { data: EquityPoint[] }) {
  const first = data[0];
  const last = data[data.length - 1];
  return (
    <div
      className="w-full"
      role="img"
      aria-label={`Equity curve and drawdown chart across ${data.length} points${
        first && last ? `, equity from ${first.equity.toFixed(2)} to ${last.equity.toFixed(2)}` : ''
      }.`}
    >
      <ResponsiveContainer width="100%" height={250}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="eqFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.32} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={60} />
          <YAxis
            domain={['dataMin - 2', 'dataMax + 2']}
            tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={44}
            tickFormatter={(v: number) => v.toFixed(0)}
          />
          <Tooltip content={<Tip />} cursor={{ stroke: 'var(--muted-foreground)', strokeDasharray: '3 3' }} />
          <ReferenceLine y={100} stroke="var(--muted-foreground)" strokeDasharray="4 4" />
          <Area type="monotone" dataKey="equity" stroke="var(--primary)" strokeWidth={2} fill="url(#eqFill)" isAnimationActive={false} />
          <Line type="monotone" dataKey="equity" stroke="var(--primary)" strokeWidth={0} dot={false} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>

      <ResponsiveContainer width="100%" height={90}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="ddFill" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="var(--destructive)" stopOpacity={0.4} />
              <stop offset="100%" stopColor="var(--destructive)" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" hide />
          <YAxis
            domain={['dataMin', 0]}
            tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={44}
            tickFormatter={(v: number) => `${v.toFixed(0)}%`}
          />
          <Tooltip content={() => null} />
          <Area type="monotone" dataKey="drawdown" stroke="var(--destructive)" strokeWidth={1.4} fill="url(#ddFill)" isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}