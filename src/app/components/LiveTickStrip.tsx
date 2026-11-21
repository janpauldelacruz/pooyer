'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Activity, Gauge, Layers, AlertTriangle } from 'lucide-react';
import MetricTile from '@/components/ui/MetricTile';
import { fmtPrice } from '@/lib/format';
import type { LiveMarket } from '@/lib/useLiveMarket';
import type { LiveAnalysis } from '@/lib/liveAnalysis';

interface LiveTickStripProps {
  market: LiveMarket;
  analysis: LiveAnalysis | null;
}

export default function LiveTickStrip({ market, analysis }: LiveTickStripProps) {
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);
  const lastPrice = useRef<number | null>(null);
  const { price, open24h, high24h, low24h, spread, status } = market;
  const up = price !== null && market.prevPrice !== null ? price >= market.prevPrice : true;
  const change = price !== null && open24h !== null ? price - open24h : null;
  const changePct = change !== null && open24h ? (change / open24h) * 100 : null;
  const spreadWide = spread !== null && analysis?.atr ? spread > analysis.atr * 0.1 : false;
  const s = analysis?.session;

  useEffect(() => {
    if (price === null) return;
    if (lastPrice.current !== null && price !== lastPrice.current) {
      setFlash(price >= lastPrice.current ? 'up' : 'down');
      const t = setTimeout(() => setFlash(null), 700);
      lastPrice.current = price;
      return () => clearTimeout(t);
    }
    lastPrice.current = price;
  }, [price]);

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <div
        className={`col-span-2 rounded-xl border border-border bg-card p-3.5 transition-all duration-150 md:col-span-1 xl:col-span-2 ${
          flash === 'up' ? 'flash-up' : flash === 'down' ? 'flash-down' : ''
        }`}
      >
        <div className="flex items-center justify-between">
          <p className="label-xs">BTCUSD · Last</p>
          <span
            className={`flex items-center gap-1.5 text-[11px] font-medium ${status === 'live' ? 'text-success' : status === 'error' ? 'text-destructive' : 'text-warning'}`}
          >
            <span className={`live-dot h-1.5 w-1.5 rounded-full ${status === 'live' ? 'bg-success' : status === 'error' ? 'bg-destructive' : 'bg-warning'}`} />
            {status === 'live' ? 'Live stream' : status === 'error' ? 'Feed offline' : status === 'stale' ? 'Feed stale — signals paused' : status === 'reconnecting' ? 'Reconnecting…' : 'Connecting…'}
          </span>
        </div>
        <div className="mt-1.5 flex items-end gap-3">
          <p className={`num text-3xl font-bold leading-none md:text-4xl ${up ? 'text-success' : 'text-destructive'}`}>
            {price !== null ? fmtPrice(price) : '—'}
          </p>
          {change !== null && changePct !== null && (
            <span className={`num mb-0.5 flex items-center gap-0.5 text-sm font-semibold ${change >= 0 ? 'text-success' : 'text-destructive'}`}>
              {change >= 0 ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
              {change >= 0 ? '+' : ''}
              {change.toFixed(2)} ({changePct.toFixed(2)}%)
            </span>
          )}
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          {high24h !== null && low24h !== null && open24h !== null
            ? `24h range ${fmtPrice(low24h)} – ${fmtPrice(high24h)} · 24h open ${fmtPrice(open24h)}`
            : 'Waiting for 24h stats from the live stream…'}
        </p>
      </div>

      <MetricTile
        label="ATR(14) · 1m"
        value={analysis?.atr ? analysis.atr.toFixed(1) : '—'}
        sub="Live volatility · stops sized from ATR"
        icon={<Activity size={15} />}
      />
      <MetricTile
        label="Spread"
        value={spread !== null ? spread.toFixed(2) : '—'}
        sub={spread === null ? 'Waiting for order book' : spreadWide ? 'Widening — consider waiting' : 'Tight — good execution'}
        tone={spreadWide ? 'warn' : 'default'}
        icon={<Gauge size={15} />}
      />
      <MetricTile
        label="Session P/L"
        value={s ? `${s.netR >= 0 ? '+' : ''}${s.netR.toFixed(1)}R` : '—'}
        sub={s ? `${s.wins}W · ${s.losses}L · ${s.expired} expired` : 'Calculating from live signals'}
        tone={s ? (s.netR > 0 ? 'good' : s.netR < 0 ? 'bad' : 'default') : 'default'}
        icon={<Layers size={15} />}
      />
      <MetricTile
        label="Loss Circuit"
        value={s ? `${s.consecutiveLosses}/${s.maxConsecutiveLossAllowed}` : '—'}
        sub={`Consecutive losses · limit ${s ? s.dailyLossLimitR.toFixed(1) : '-4.0'}R daily`}
        tone={s && s.consecutiveLosses >= 2 ? 'bad' : 'default'}
        icon={<AlertTriangle size={15} />}
      />
    </div>
  );
}