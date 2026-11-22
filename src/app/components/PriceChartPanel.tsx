'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import Card from '@/components/ui/Card';
import type { LiveAnalysis } from '@/lib/liveAnalysis';
import { CandleThemeId, getCandleTheme } from '@/lib/settings';

const PriceChartClient = dynamic(() => import('./PriceChartClient'), {
  ssr: false,
  loading: () => <div className="h-[310px] w-full animate-pulse rounded-lg bg-muted" />,
});

const TOGGLES = [
  { id: 'tg-ema', key: 'ema', label: 'EMA 9/21/50', swatch: 'bg-success' },
  { id: 'tg-vwap', key: 'vwap', label: 'VWAP', swatch: 'bg-foreground' },
  { id: 'tg-bb', key: 'bands', label: 'Bollinger 20,2', swatch: 'bg-muted-foreground' },
] as const;

export default function PriceChartPanel({ analysis, candleTheme = 'neon' }: { analysis: LiveAnalysis | null; candleTheme?: CandleThemeId }) {
  const [on, setOn] = useState({ ema: true, vwap: true, bands: true });
  const theme = getCandleTheme(candleTheme);
  const data = analysis?.chartCandles ?? [];
  const last = analysis?.candles?.[analysis.candles.length - 1];

  return (
    <Card
      title="BTCUSD · 1m candlesticks"
      subtitle="Last 60 live candles · ▲ long ▼ short markers · active levels overlaid"
      action={
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {TOGGLES.map((t) => {
            const active = on[t.key];
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setOn((o) => ({ ...o, [t.key]: !o[t.key] }))}
                aria-pressed={active}
                className={`flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium transition-all duration-150 active:scale-95 ${
                  active
                    ? 'border-primary/50 bg-primary/10 text-foreground'
                    : 'border-border bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${t.swatch}`} aria-hidden="true" />
                {t.label}
              </button>
            );
          })}
        </div>
      }
      bodyClassName="p-2.5"
    >
      {data.length === 0 ? (
        <div className="flex h-[310px] items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">
          Waiting for live BTCUSD candles…
        </div>
      ) : (
        <PriceChartClient data={data} showBands={on.bands} showEma={on.ema} showVwap={on.vwap} active={analysis?.active ?? null} candleTheme={candleTheme} />
      )}
      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-1.5 text-[11px] text-muted-foreground">
        <span className="sr-only">Chart legend:</span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2 rounded-[2px]" style={{ background: theme.up }} aria-hidden="true" /> Up candle
          <span className="ml-1 h-2.5 w-2 rounded-[2px]" style={{ background: theme.down }} aria-hidden="true" /> Down candle
        </span>
        {last && (
          <span className="num ml-auto">
            RSI {last.rsi.toFixed(1)} · MACD hist {last.macdHist >= 0 ? '+' : ''}{last.macdHist.toFixed(2)}
          </span>
        )}
      </div>
    </Card>
  );
}