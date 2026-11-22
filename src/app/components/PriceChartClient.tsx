'use client';

import React from 'react';
import {
  ComposedChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Scatter,
} from 'recharts';
import { Candle } from '@/lib/types';
import type { ActiveSignal } from '@/lib/liveAnalysis';
import { fmtPrice } from '@/lib/format';

interface PriceChartClientProps {
  data: Candle[];
  showBands: boolean;
  showEma: boolean;
  showVwap: boolean;
  active: ActiveSignal | null;
}

interface TooltipPayloadItem {
  payload: Candle;
}

function ChartTip({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) {
  if (!active || !payload || !payload.length) return null;
  const c = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-card p-3 text-xs shadow-xl">
      <p className="num mb-1.5 font-semibold text-foreground">{c.time} UTC</p>
      <div className="num grid grid-cols-2 gap-x-4 gap-y-0.5 text-muted-foreground">
        <span>O <span className="text-foreground">{fmtPrice(c.open)}</span></span>
        <span>H <span className="text-foreground">{fmtPrice(c.high)}</span></span>
        <span>L <span className="text-foreground">{fmtPrice(c.low)}</span></span>
        <span>C <span className="text-foreground">{fmtPrice(c.close)}</span></span>
        <span>EMA9 <span className="text-primary">{fmtPrice(c.ema9)}</span></span>
        <span>VWAP <span className="text-accent">{fmtPrice(c.vwap)}</span></span>
        <span>RSI <span className="text-foreground">{c.rsi}</span></span>
        <span>Vol <span className="text-foreground">{c.volume}</span></span>
      </div>
    </div>
  );
}

interface MarkProps {
  cx?: number;
  cy?: number;
  payload?: Candle;
}

function SignalMark({ cx, cy, payload }: MarkProps) {
  if (cx === undefined || cy === undefined || !payload || !payload.markSide) return null;
  const long = payload.markSide === 'LONG';
  const color = long ? 'var(--success)' : 'var(--destructive)';
  const d = long ? 'M0,-7 L7,6 L-7,6 Z' : 'M0,7 L7,-6 L-7,-6 Z';
  return (
    <g transform={`translate(${cx},${cy})`}>
      <path d={d} fill={color} stroke="var(--background)" strokeWidth={1.5} />
    </g>
  );
}

export default function PriceChartClient({ data, showBands, showEma, showVwap, active }: PriceChartClientProps) {
  const levels = active ? [active.entry, active.sl, active.tp1, active.tp2] : [];
  const prices = [...data.flatMap((d) => [d.low, d.high, d.bbLower, d.bbUpper]), ...levels];
  const min = Math.floor(Math.min(...prices) - 20);
  const max = Math.ceil(Math.max(...prices) + 20);

  return (
    <div
      className="w-full"
      role="img"
      aria-label={`BTCUSD 1-minute price chart with ${data.length} live candles${
        active ? `, active ${active.side === 'LONG' ? 'buy' : 'sell'} signal at entry ${fmtPrice(active.entry)}, stop ${fmtPrice(active.sl)}, targets ${fmtPrice(active.tp1)} and ${fmtPrice(active.tp2)}` : ', no active signal'
      }. Latest close ${data.length ? fmtPrice(data[data.length - 1].close) : 'unavailable'}.`}
    >
      <ResponsiveContainer width="100%" height={250}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="time" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} tickLine={false} axisLine={false} interval={9} />
          <YAxis
            domain={[min, max]}
            orientation="right"
            tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={62}
            tickFormatter={(v: number) => fmtPrice(v, 0)}
          />
          <Tooltip content={<ChartTip />} cursor={{ stroke: 'var(--muted-foreground)', strokeDasharray: '3 3' }} />

          {showBands && (
            <>
              <Line type="monotone" dataKey="bbUpper" stroke="var(--muted-foreground)" strokeWidth={1} strokeDasharray="4 3" dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="bbLower" stroke="var(--muted-foreground)" strokeWidth={1} strokeDasharray="4 3" dot={false} isAnimationActive={false} />
            </>
          )}

          <Area type="monotone" dataKey="close" stroke="var(--primary)" strokeWidth={2} fill="url(#priceFill)" isAnimationActive={false} />

          {showEma && (
            <>
              <Line type="monotone" dataKey="ema9" stroke="var(--success)" strokeWidth={1.4} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="ema21" stroke="var(--accent)" strokeWidth={1.4} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="ema50" stroke="var(--destructive)" strokeWidth={1.4} dot={false} isAnimationActive={false} />
            </>
          )}
          {showVwap && (
            <Line type="monotone" dataKey="vwap" stroke="var(--foreground)" strokeWidth={1.2} strokeDasharray="2 3" dot={false} isAnimationActive={false} />
          )}

          <Scatter dataKey="mark" shape={<SignalMark />} isAnimationActive={false} />

          {active && (
            <>
              <ReferenceLine y={active.entry} stroke="var(--primary)" strokeDasharray="5 4" label={{ value: 'ENTRY', fill: 'var(--primary)', fontSize: 10, position: 'insideLeft' }} />
              <ReferenceLine y={active.sl} stroke="var(--destructive)" strokeDasharray="5 4" label={{ value: 'SL', fill: 'var(--destructive)', fontSize: 10, position: 'insideLeft' }} />
              <ReferenceLine y={active.tp1} stroke="var(--success)" strokeDasharray="5 4" label={{ value: 'TP1', fill: 'var(--success)', fontSize: 10, position: 'insideLeft' }} />
              <ReferenceLine y={active.tp2} stroke="var(--success)" strokeDasharray="5 4" label={{ value: 'TP2', fill: 'var(--success)', fontSize: 10, position: 'insideLeft' }} />
            </>
          )}
        </ComposedChart>
      </ResponsiveContainer>

      <ResponsiveContainer width="100%" height={48}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <XAxis dataKey="time" hide />
          <YAxis orientation="right" hide />
          <Tooltip content={() => null} cursor={{ fill: 'var(--secondary)' }} />
          <Bar dataKey="volume" fill="var(--muted-foreground)" fillOpacity={0.55} radius={[2, 2, 0, 0]} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}