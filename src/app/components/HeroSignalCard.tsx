'use client';

import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Timer, Copy, Bell, Crosshair, ShieldAlert, Target, Calculator, Hourglass, Radar } from 'lucide-react';
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
      <section aria-label="Signal status" className="border-gradient scan-sweep relative h-full overflow-hidden rounded-xl bg-card">
        <div className="blob-primary pointer-events-none absolute -right-16 -top-16 h-48 w-48" aria-hidden="true" />
        <div className="relative p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="info" dot>{loading ? 'CONNECTING' : 'SCANNING'}</Badge>
            <span className="text-[11px] text-muted-foreground">Live BTCUSD 1m · 4 strategy modules</span>
          </div>
          <div className="mt-3 flex flex-col items-center gap-2 py-4 text-center">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary signal-pulse">
              {loading ? <Hourglass size={24} aria-hidden="true" /> : <Radar size={24} aria-hidden="true" />}
            </div>
            <p className="text-lg font-extrabold text-foreground">
              {loading ? 'Loading live market data…' : <>Hunting the next <span className="text-gradient">high-probability</span> setup</>}
            </p>
            <p className="max-w-sm text-xs text-muted-foreground">
              {loading
                ? 'Waiting for real BTCUSD candles from the live feed.'
                : 'Every closed 1m candle is scored. A BUY or SELL lands here only when the confluence is confirmed.'}
            </p>
            {ev && (
              <p className="num text-xs text-muted-foreground">
                Bias: <span className="font-semibold text-foreground">{ev.bias ?? 'Neutral'}</span> · {ev.biasChecks}/{ev.checks.length} checks aligned
              </p>
            )}
          </div>
          {analysis?.sampleWinRate !== null && analysis?.sampleWinRate !== undefined && (
            <p className="text-center text-[11px] text-muted-foreground">
              Recent live sample: <span className="num font-semibold text-foreground">{analysis.sampleWinRate}%</span> win rate over{' '}
              <span className="num font-semibold text-foreground">{analysis.sampleSize}</span> resolved signals
            </p>
          )}
        </div>
      </section>
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
    <section aria-label="Active signal" className={`relative h-full overflow-hidden rounded-xl border border-border bg-card ${glow}`}>
      <p key={s.id} className="sr-only" role="status">
        {`Active ${long ? 'buy' : 'sell'} signal for BTCUSD. Entry ${fmtPrice(s.entry)}, stop loss ${fmtPrice(s.sl)}, take profit ${fmtPrice(s.tp1)}. Confidence ${s.confidence}.`}
      </p>
      <div className="blob-primary pointer-events-none absolute -right-16 -top-16 h-48 w-48" aria-hidden="true" />
      <div className="relative p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={long ? 'long' : 'short'} dot>ACTIVE SIGNAL</Badge>
            <Badge tone="info">{MODULE_LABELS[s.module]}</Badge>
          </div>
          <span className={`num flex items-center gap-1 text-xs font-semibold ${stale ? 'text-warning' : 'text-muted-foreground'}`}>
            <Timer size={13} aria-hidden="true" />
            Valid for {remaining}s
          </span>
        </div>

        <div className="mt-2.5 flex items-center gap-3">
          <ConfidenceRing value={s.confidence} tone={long ? 'long' : 'short'} size={92} stroke={8} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {long ? <TrendingUp size={24} className={tone} aria-hidden="true" /> : <TrendingDown size={24} className={tone} aria-hidden="true" />}
              <p className={`signal-pulse text-4xl font-black tracking-tight ${tone}`}>{long ? 'BUY' : 'SELL'}</p>
              <span className="label-xs">{long ? 'Long' : 'Short'} BTCUSD</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              <span className="num font-semibold text-foreground">{s.confluence}/{s.confluenceTotal}</span> checks aligned · fired{' '}
              <span className="num">{age}s</span> ago
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {analysis?.sampleWinRate !== null && analysis?.sampleWinRate !== undefined ? (
                <>
                  Live sample win rate <span className="num font-semibold text-foreground">{analysis.sampleWinRate}%</span> · n=
                  <span className="num font-semibold text-foreground">{analysis.sampleSize}</span>
                </>
              ) : (
                'Not enough resolved signals for a win rate yet'
              )}
            </p>
          </div>
        </div>

        <div
          className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-secondary"
          role="progressbar"
          aria-label="Signal validity remaining"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct)}
        >
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-linear ${stale ? 'bg-warning' : 'bg-primary'}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {driftTooFar && (
          <div role="status" className="slide-in mt-2 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-2.5 py-1.5 text-xs text-warning">
            <ShieldAlert size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
            Price has drifted {Math.abs(drift).toFixed(1)} from entry. Chasing reduces R:R — wait for a retest.
          </div>
        )}

        <div className="mt-2.5 grid grid-cols-2 gap-2 md:grid-cols-4">
          <div className="rounded-lg border border-primary/35 bg-primary/10 px-2.5 py-2">
            <p className="label-xs flex items-center gap-1"><Crosshair size={11} aria-hidden="true" /> Entry</p>
            <p className="num mt-0.5 text-base font-bold text-foreground">{fmtPrice(s.entry)}</p>
            <p className="num text-[10.5px] text-muted-foreground">Candle close</p>
          </div>
          <div className="rounded-lg border border-destructive/35 bg-destructive/10 px-2.5 py-2">
            <p className="label-xs flex items-center gap-1"><ShieldAlert size={11} aria-hidden="true" /> Stop loss</p>
            <p className="num mt-0.5 text-base font-bold text-destructive">{fmtPrice(s.sl)}</p>
            <p className="num text-[10.5px] text-muted-foreground">{long ? '−' : '+'}{riskDist.toFixed(1)} · 1.0× ATR</p>
          </div>
          <div className="rounded-lg border border-success/35 bg-success/10 px-2.5 py-2">
            <p className="label-xs flex items-center gap-1"><Target size={11} aria-hidden="true" /> Take profit 1</p>
            <p className="num mt-0.5 text-base font-bold text-success">{fmtPrice(s.tp1)}</p>
            <p className="num text-[10.5px] text-muted-foreground">R:R 1:{rr1.toFixed(1)} · 50%</p>
          </div>
          <div className="rounded-lg border border-success/35 bg-success/10 px-2.5 py-2">
            <p className="label-xs flex items-center gap-1"><Target size={11} aria-hidden="true" /> Take profit 2</p>
            <p className="num mt-0.5 text-base font-bold text-success">{fmtPrice(s.tp2)}</p>
            <p className="num text-[10.5px] text-muted-foreground">R:R 1:{rr2.toFixed(1)} · runner</p>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between rounded-lg border border-border bg-muted px-2.5 py-1.5 text-[11px]">
          <span className="text-muted-foreground">Invalidated if a 1m candle closes {long ? 'below' : 'above'}</span>
          <span className="num font-semibold text-warning">{fmtPrice(s.invalidationLevel)}</span>
        </div>

        <div className="mt-2 rounded-lg border border-border bg-muted px-2.5 py-2">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="risk-input" className="label-xs flex items-center gap-1">
              <Calculator size={11} aria-hidden="true" /> Position size
            </label>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground">Risk $</span>
              <input
                id="risk-input"
                type="number"
                min={1}
                inputMode="decimal"
                aria-describedby="risk-result"
                value={risk}
                onChange={(e) => setRisk(Math.max(0, Number(e.target.value)))}
                className="num w-20 rounded-md border border-border bg-input px-2 py-0.5 text-right text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-[11px] text-muted-foreground">For {fmtPrice(riskDist, 1)} stop distance</span>
            <span id="risk-result" className="num text-sm font-bold text-foreground">{size.toFixed(4)} BTC</span>
          </div>
        </div>

        <div className="mt-2.5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={copyLevels}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-[13px] font-bold text-primary-foreground shadow-[0_0_24px_-6px_var(--primary)] transition-all duration-150 hover:brightness-110 active:scale-95"
          >
            <Copy size={14} aria-hidden="true" /> Copy Order Levels
          </button>
          <button
            type="button"
            onClick={() => onReplayAlert(s.side)}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-2 text-[13px] font-semibold text-secondary-foreground transition-all duration-150 hover:bg-muted active:scale-95"
          >
            <Bell size={14} aria-hidden="true" /> Replay Alert
          </button>
        </div>
      </div>
    </section>
  );
}