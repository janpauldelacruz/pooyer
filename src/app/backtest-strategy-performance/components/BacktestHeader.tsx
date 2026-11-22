'use client';

import React from 'react';
import { CalendarRange, Layers, FlaskConical, Loader2 } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import type { BacktestResult } from '@/lib/backtestEngine';

interface BacktestHeaderProps {
  range: string;
  onRange: (v: string) => void;
  moduleFilter: string;
  onModule: (v: string) => void;
  running: boolean;
  result: BacktestResult | null;
}

const RANGES = [
  { id: 'rg-1', value: '1d', label: '1D' },
  { id: 'rg-3', value: '3d', label: '3D' },
  { id: 'rg-7', value: '7d', label: '7D' },
  { id: 'rg-14', value: '14d', label: '14D' },
];

const MODULES = [
  { id: 'mf-all', value: 'all', label: 'All modules combined' },
  { id: 'mf-confluence', value: 'confluence', label: 'Confluence only' },
  { id: 'mf-pullback', value: 'pullback', label: 'Pullback only' },
  { id: 'mf-breakout', value: 'breakout', label: 'Breakout only' },
  { id: 'mf-meanrev', value: 'meanrev', label: 'Mean reversion only' },
];

function stamp(ms: number) {
  const d = new Date(ms);
  const p = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())} UTC`;
}

export default function BacktestHeader({ range, onRange, moduleFilter, onModule, running, result }: BacktestHeaderProps) {
  return (
    <div className="border-gradient flex flex-col gap-2 rounded-xl bg-card px-3 py-2.5 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-bold tracking-tight text-foreground">
            Combined strategy · <span className="text-gradient">BTCUSD 1m</span>
          </h2>
          {running ? (
            <Badge tone="warn" dot>Running</Badge>
          ) : result ? (
            <Badge tone="success" dot>Computed from live data</Badge>
          ) : (
            <Badge tone="neutral">No results</Badge>
          )}
        </div>
        <p className="mt-0.5 text-[11px] text-muted-foreground" aria-live="polite">
          {result ? (
            <>
              <span className="num">{result.kpis.totalTrades}</span> trades on <span className="num">{result.bars.toLocaleString('en-US')}</span> real Binance 1m candles ·{' '}
              <span className="num">{stamp(result.from)}</span> → <span className="num">{stamp(result.to)}</span> · spread {result.params.spread} and {result.params.slippage} slippage modeled
            </>
          ) : (
            'Fetching real BTCUSDT 1m history from Binance'
          )}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-muted p-0.5" role="group" aria-label="Date range">
          <CalendarRange size={13} className="ml-1.5 text-muted-foreground" aria-hidden="true" />
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onRange(r.value)}
              disabled={running}
              aria-pressed={range === r.value}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all duration-150 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${
                range === r.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <label htmlFor="module-filter" className="sr-only">Module filter</label>
          <Layers size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <select
            id="module-filter"
            value={moduleFilter}
            onChange={(e) => onModule(e.target.value)}
            className="appearance-none rounded-lg border border-border bg-input py-1.5 pl-8 pr-7 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {MODULES.map((m) => (
              <option key={m.id} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        <span className="hidden items-center gap-1.5 rounded-lg border border-border bg-muted px-2.5 py-1.5 text-[11px] text-muted-foreground sm:flex">
          {running ? <Loader2 size={12} className="animate-spin" aria-hidden="true" /> : <FlaskConical size={12} aria-hidden="true" />}
          {running ? 'Replaying candles…' : 'No look-ahead replay'}
        </span>
      </div>
    </div>
  );
}