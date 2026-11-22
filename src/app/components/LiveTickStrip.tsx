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

  const feedName = market.activeSource === 'icmarkets' ? 'IC Markets SC' : market.usingBackup ? 'Binance backup' : 'Binance';
  const statusText =
    status === 'live' ? `Live · ${feedName}`
      : status === 'error' ? 'Feed offline'
      : status === 'stale' ? 'Feed stale — signals paused'
      : status === 'reconnecting' ? 'Reconnecting…' : 'Connecting…';

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
      <div
        className={`border-gradient col-span-2 rounded-lg bg-card px-3 py-2 transition-all duration-150 md:col-span-3 xl:col-span-2 ${
          flash === 'up' ? 'flash-up' : flash === 'down' ? 'flash-down' : ''
        }`}
      >
        <div className="flex items-center justify-between">
          <p className="label-xs">BTCUSD · Last</p>
          <span
            role="status"
            className={`flex items-center gap-1.5 text-[11px] font-medium ${status === 'live' ? 'text-success' : status === 'error' ? 'text-destructive' : 'text-warning'}`}
          >
            <span className={`live-dot h-1.5 w-1.5 rounded-full ${status === 'live' ? 'bg-success' : status === 'error' ? 'bg-destructive' : 'bg-warning'}`} aria-hidden="true" />
            {statusText}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-end gap-x-3">
          <p className={`num text-3xl font-black leading-none ${up ? 'text-success' : 'text-destructive'}`}>
            {price !== null ? fmtPrice(price) : '—'}
          </p>
          {change !== null && changePct !== null && (
            <span className={`num mb-0.5 flex items-center gap-0.5 text-xs font-semibold ${change >= 0 ? 'text-success' : 'text-destructive'}`}>
              {change >= 0 ? <ArrowUpRight size={14} aria-hidden="true" /> : <ArrowDownRight size={14} aria-hidden="true" />}
              {change >= 0 ? '+' : ''}
              {change.toFixed(2)} ({changePct.toFixed(2)}%)
            </span>
          )}
        </div>
        <p className="mt-1 truncate text-[11px] text-muted-foreground">
          {high24h !== null && low24h !== null && open24h !== null
            ? `24h ${fmtPrice(low24h)} – ${fmtPrice(high24h)} · open ${fmtPrice(open24h)}`
            : 'Waiting for 24h stats from the live stream…'}
        </p>
      </div>

      <MetricTile
        label="ATR(14) · 1m"
        value={analysis?.atr ? analysis.atr.toFixed(1) : '—'}
        sub="Live volatility"
        icon={<Activity size={13} />}
      />
      <MetricTile
        label="Spread"
        value={spread !== null ? spread.toFixed(2) : '—'}
        sub={spread === null ? 'Waiting for order book' : spreadWide ? 'Widening — wait' : 'Tight — good fills'}
        tone={spreadWide ? 'warn' : 'default'}
        icon={<Gauge size={13} />}
      />
      <MetricTile
        label="Session P/L"
        value={s ? `${s.netR >= 0 ? '+' : ''}${s.netR.toFixed(1)}R` : '—'}
        sub={s ? `${s.wins}W · ${s.losses}L · ${s.expired} exp` : 'Calculating…'}
        tone={s ? (s.netR > 0 ? 'good' : s.netR < 0 ? 'bad' : 'default') : 'default'}
        icon={<Layers size={13} />}
      />
      <MetricTile
        label="Loss Circuit"
        value={s ? `${s.consecutiveLosses}/${s.maxConsecutiveLossAllowed}` : '—'}
        sub={`Limit ${s ? s.dailyLossLimitR.toFixed(1) : '-4.0'}R daily`}
        tone={s && s.consecutiveLosses >= 2 ? 'bad' : 'default'}
        icon={<AlertTriangle size={13} />}
      />
    </div>
  );
}