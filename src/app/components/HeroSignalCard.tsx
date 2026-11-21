'use client';

import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Timer, Copy, Bell, Crosshair, ShieldAlert, Target, Calculator, Hourglass } from 'lucide-react';
import { toast } from 'sonner';
import Badge from '@/components/ui/Badge';
import ConfidenceRing from './ConfidenceRing';
import { MODULE_LABELS } from '@/lib/types';
import { fmtPrice } from '@/lib/format';
import type { LiveAnalysis } from '@/lib/liveAnalysis';

interface HeroSignalCardProps {
  analysis: LiveAnalysis | null;
  price: number | null;
  now: number;
  loading: boolean;
  onReplayAlert: (side: 'LONG' | 'SHORT') => void;
}

export default function HeroSignalCard({ analysis, price, now, loading, onReplayAlert }: HeroSignalCardProps) {
  const [risk, setRisk] = useState(100);
  const s = analysis?.active ?? null;

  if (!s) {
    const ev = analysis?.evaluation;
    return (
      <div className="relative overflow-hidden rounded-xl border border-border bg-card">
        <div className="relative p-4 md:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="info" dot>{loading ? 'CONNECTING' : 'SCANNING'}</Badge>
            <span className="text-xs text-muted-foreground">Live BTCUSD 1m · 4 strategy modules</span>
          </div>
          <div className="mt-6 flex flex-col items-center gap-3 py-6 text-center">
            <Hourglass size={30} className="text-muted-foreground" />
            <p className="text-xl font-bold text-foreground">{loading ? 'Loading live market data…' : 'No active signal'}</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              {loading
                ? 'Waiting for real BTCUSD candles from the live feed.'
                : 'The engine is evaluating every live 1m candle. A BUY or SELL appears here only when a high-probability setup is confirmed.'}
            </p>
            {ev && (
              <p className="num text-xs text-muted-foreground">
                Current bias: <span className="font-semibold text-foreground">{ev.bias ?? 'Neutral'}</span> · {ev.biasChecks}/{ev.checks.length} checks aligned
              </p>
            )}
          </div>
          {analysis?.sampleWinRate !== null && analysis?.sampleWinRate !== undefined && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Recent live sample: <span className="num font-semibold text-foreground">{analysis.sampleWinRate}%</span> win rate over{' '}
              <span className="num font-semibold text-foreground">{analysis.sampleSize}</span> resolved signals
            </p>
          )}
        </div>
      </div>
    );
  }

  const long = s.side === 'LONG';
  const age = Math.max(0, Math.round((now - s.firedAt) / 1000));
  const remaining = Math.max(s.validForSeconds - age, 0);
  const pct = (remaining / s.validForSeconds) * 100;
  const stale = remaining < 30;
  const riskDist = Math.abs(s.entry - s.sl);
  const size = riskDist > 0 ? risk / riskDist : 0;
  const drift = price !== null ? price - s.entry : 0;
  const driftTooFar = Math.abs(drift) > riskDist * 0.25;
  const rr1 = riskDist > 0 ? Math.abs(s.tp1 - s.entry) / riskDist : 0;
  const rr2 = riskDist > 0 ? Math.abs(s.tp2 - s.entry) / riskDist : 0;
  const glow = long ? 'glow-long' : 'glow-short';
  const tone = long ? 'text-success' : 'text-destructive';

  const copyLevels = () => {
    const text = `${s.side} BTCUSD @ ${s.entry} | SL ${s.sl} | TP1 ${s.tp1} | TP2 ${s.tp2}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => undefined);
    }
    toast.success('Levels copied', { description: text });
  };

  return (
    <div className={`relative overflow-hidden rounded-xl border border-border bg-card ${glow}`}>
      <div className="blob-primary pointer-events-none absolute -right-20 -top-20 h-56 w-56" />
      <div className="relative p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={long ? 'long' : 'short'} dot>ACTIVE SIGNAL</Badge>
            <Badge tone="info">{MODULE_LABELS[s.module]}</Badge>
          </div>
          <span className={`num flex items-center gap-1.5 text-xs font-semibold ${stale ? 'text-warning' : 'text-muted-foreground'}`}>
            <Timer size={14} />
            Valid for {remaining}s
          </span>
        </div>

        <div className="mt-4 flex items-center gap-4 md:gap-6">
          <ConfidenceRing value={s.confidence} tone={long ? 'long' : 'short'} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {long ? <TrendingUp size={26} className={tone} /> : <TrendingDown size={26} className={tone} />}
              <p className={`text-3xl font-bold tracking-tight md:text-4xl ${tone}`}>{long ? 'BUY' : 'SELL'}</p>
              <span className="label-xs">{long ? 'Long' : 'Short'} BTCUSD</span>
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">
              <span className="num font-semibold text-foreground">{s.confluence}/{s.confluenceTotal}</span> checks aligned · fired{' '}
              <span className="num">{age}s</span> ago
            </p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {analysis?.sampleWinRate !== null && analysis?.sampleWinRate !== undefined ? (
                <>
                  <span>
                    Live sample win rate <span className="num font-semibold text-foreground">{analysis.sampleWinRate}%</span>
                  </span>
                  <span>
                    Sample <span className="num font-semibold text-foreground">{analysis.sampleSize}</span>
                  </span>
                </>
              ) : (
                <span>Not enough resolved signals for a win rate yet</span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-linear ${stale ? 'bg-warning' : 'bg-primary'}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {driftTooFar && (
          <div className="slide-in mt-3 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
            <ShieldAlert size={14} className="mt-0.5 shrink-0" />
            Price has drifted {Math.abs(drift).toFixed(1)} from entry. Chasing reduces R:R — wait for a retest.
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2.5 md:grid-cols-4">
          <div className="rounded-lg border border-primary/30 bg-primary/10 p-3">
            <p className="label-xs flex items-center gap-1.5"><Crosshair size={12} /> Entry</p>
            <p className="num mt-1 text-lg font-bold text-foreground">{fmtPrice(s.entry)}</p>
            <p className="num text-[11px] text-muted-foreground">Candle close price</p>
          </div>
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
            <p className="label-xs flex items-center gap-1.5"><ShieldAlert size={12} /> Stop loss</p>
            <p className="num mt-1 text-lg font-bold text-destructive">{fmtPrice(s.sl)}</p>
            <p className="num text-[11px] text-muted-foreground">{long ? '−' : '+'}{riskDist.toFixed(1)} · 1.0× ATR</p>
          </div>
          <div className="rounded-lg border border-success/30 bg-success/10 p-3">
            <p className="label-xs flex items-center gap-1.5"><Target size={12} /> Take profit 1</p>
            <p className="num mt-1 text-lg font-bold text-success">{fmtPrice(s.tp1)}</p>
            <p className="num text-[11px] text-muted-foreground">R:R 1:{rr1.toFixed(1)} · close 50%</p>
          </div>
          <div className="rounded-lg border border-success/30 bg-success/10 p-3">
            <p className="label-xs flex items-center gap-1.5"><Target size={12} /> Take profit 2</p>
            <p className="num mt-1 text-lg font-bold text-success">{fmtPrice(s.tp2)}</p>
            <p className="num text-[11px] text-muted-foreground">R:R 1:{rr2.toFixed(1)} · runner</p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between rounded-lg border border-border bg-muted px-3 py-2 text-xs">
          <span className="text-muted-foreground">Invalidated if a 1m candle closes {long ? 'below' : 'above'}</span>
          <span className="num font-semibold text-warning">{fmtPrice(s.invalidationLevel)}</span>
        </div>

        <div className="mt-4 rounded-lg border border-border bg-muted p-3">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="risk-input" className="label-xs flex items-center gap-1.5">
              <Calculator size={12} /> Position size calculator
            </label>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Risk $</span>
              <input
                id="risk-input"
                type="number"
                min={1}
                value={risk}
                onChange={(e) => setRisk(Math.max(0, Number(e.target.value)))}
                className="num w-20 rounded-md border border-border bg-input px-2 py-1 text-right text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xs text-muted-foreground">Size for {fmtPrice(riskDist, 1)} stop distance</span>
            <span className="num text-base font-bold text-foreground">{size.toFixed(4)} BTC</span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={copyLevels}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all duration-150 hover:opacity-90 active:scale-95"
          >
            <Copy size={15} /> Copy Order Levels
          </button>
          <button
            type="button"
            onClick={() => onReplayAlert(s.side)}
            className="flex items-center justify-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm font-semibold text-secondary-foreground transition-all duration-150 hover:bg-muted active:scale-95"
          >
            <Bell size={15} /> Replay Alert
          </button>
        </div>
      </div>
    </div>
  );
}