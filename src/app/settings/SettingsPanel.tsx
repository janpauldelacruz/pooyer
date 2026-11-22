'use client';

import React from 'react';
import { Volume2, ShieldAlert, CandlestickChart, Radio, RotateCcw, PlayCircle, Check } from 'lucide-react';
import { toast } from 'sonner';
import AppLayout from '@/components/AppLayout';
import Card from '@/components/ui/Card';
import Toggle from '@/components/ui/Toggle';
import { CANDLE_THEMES, DATA_SOURCES, useSettings, getDataSource } from '@/lib/settings';
import { useLiveMarket } from '@/lib/useLiveMarket';

function playPreview(volume: number) {
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    const gain = ctx.createGain();
    gain.gain.value = (volume / 100) * 0.25;
    gain.connect(ctx.destination);
    [660, 880].forEach((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;
      osc.connect(gain);
      osc.start(ctx.currentTime + i * 0.14);
      osc.stop(ctx.currentTime + i * 0.14 + 0.12);
    });
    setTimeout(() => ctx.close().catch(() => undefined), 800);
  } catch {
    // audio blocked until user interaction
  }
}

function CandlePreview({ up, down, hollowUp }: { up: string; down: string; hollowUp: boolean }) {
  const candles = [
    { o: 40, c: 24, h: 16, l: 48, u: true },
    { o: 24, c: 30, h: 18, l: 36, u: false },
    { o: 30, c: 14, h: 8, l: 34, u: true },
    { o: 14, c: 22, h: 10, l: 28, u: false },
    { o: 22, c: 8, h: 4, l: 26, u: true },
  ];
  return (
    <svg viewBox="0 0 80 56" className="h-12 w-full" aria-hidden="true">
      {candles.map((c, i) => {
        const x = 8 + i * 15;
        const col = c.u ? up : down;
        return (
          <g key={i}>
            <line x1={x} x2={x} y1={c.h} y2={c.l} stroke={col} strokeWidth={1.4} />
            <rect
              x={x - 4}
              y={Math.min(c.o, c.c)}
              width={8}
              height={Math.abs(c.o - c.c)}
              fill={c.u && hollowUp ? 'transparent' : col}
              stroke={col}
              strokeWidth={1.2}
              rx={1}
            />
          </g>
        );
      })}
    </svg>
  );
}

export default function SettingsPanel() {
  const { settings, update, reset } = useSettings();
  const market = useLiveMarket(60, settings.dataSource);
  const source = getDataSource(settings.dataSource);

  return (
    <AppLayout title="Settings" soundOn={settings.alertVolume > 0} price={market.price} status={market.status}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">Saved automatically in this browser and applied to the live terminal instantly.</p>
          <button
            type="button"
            onClick={() => {
              reset();
              toast.success('Settings reset to defaults');
            }}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground transition-all duration-150 hover:bg-muted active:scale-95"
          >
            <RotateCcw size={13} aria-hidden="true" /> Reset to defaults
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Card
            title="Alert volume"
            subtitle="Loudness of long and short alert tones"
            action={<Volume2 size={15} className="text-primary" aria-hidden="true" />}
          >
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="set-vol" className="text-[13px] font-medium text-foreground">Volume</label>
                  <span className="num rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                    {settings.alertVolume === 0 ? 'Muted' : `${settings.alertVolume}%`}
                  </span>
                </div>
                <input
                  id="set-vol"
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={settings.alertVolume}
                  onChange={(e) => update({ alertVolume: Number(e.target.value) })}
                  className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
                />
                <div className="mt-1 flex justify-between text-[10px] text-muted-foreground" aria-hidden="true">
                  <span>0</span><span>50</span><span>100</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => playPreview(settings.alertVolume)}
                disabled={settings.alertVolume === 0}
                className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground transition-all duration-150 hover:bg-muted active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <PlayCircle size={13} aria-hidden="true" /> Play preview
              </button>
              <p className="text-[11px] text-muted-foreground">
                Sound on/off and minimum confidence stay in the Alert controls panel on the Live Signals page.
              </p>
            </div>
          </Card>

          <Card
            title="Risk warnings"
            subtitle="Cautions shown alongside live signals"
            action={<ShieldAlert size={15} className="text-warning" aria-hidden="true" />}
          >
            <div className="space-y-3">
              <Toggle
                id="set-risk"
                checked={settings.riskWarnings}
                onChange={(v) => update({ riskWarnings: v })}
                label="Show risk warnings"
                description="Master switch for all warnings below"
              />
              <div className={`space-y-3 border-t border-border pt-3 transition-opacity duration-150 ${settings.riskWarnings ? 'opacity-100' : 'pointer-events-none opacity-50'}`}>
                <Toggle
                  id="set-risk-disclaimer"
                  checked={settings.riskDisclaimer}
                  onChange={(v) => update({ riskDisclaimer: v })}
                  label="Trading risk disclaimer"
                  description="Footer notice on the Live Signals page"
                />
                <Toggle
                  id="set-risk-drift"
                  checked={settings.driftWarning}
                  onChange={(v) => update({ driftWarning: v })}
                  label="Price drift warning"
                  description="Warn when price moves far from entry"
                />
                <Toggle
                  id="set-risk-conf"
                  checked={settings.lowConfidenceWarning}
                  onChange={(v) => update({ lowConfidenceWarning: v })}
                  label="Low-confidence warning"
                  description="Flag active signals scored under 70"
                />
              </div>
            </div>
          </Card>

          <Card
            title="Candlestick theme"
            subtitle="Colors used by the live price chart"
            action={<CandlestickChart size={15} className="text-primary" aria-hidden="true" />}
          >
            <div role="radiogroup" aria-label="Candlestick theme" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {CANDLE_THEMES.map((t) => {
                const selected = settings.candleTheme === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => update({ candleTheme: t.id })}
                    className={`relative rounded-lg border p-2 text-left transition-all duration-150 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      selected ? 'border-primary bg-primary/10' : 'border-border bg-secondary hover:border-primary/40'
                    }`}
                  >
                    <CandlePreview up={t.up} down={t.down} hollowUp={t.hollowUp} />
                    <p className="mt-1 text-xs font-semibold text-foreground">{t.label}</p>
                    <p className="text-[10px] leading-tight text-muted-foreground">{t.description}</p>
                    {selected && (
                      <span className="absolute right-1.5 top-1.5 rounded-full bg-primary p-0.5 text-primary-foreground">
                        <Check size={10} aria-hidden="true" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </Card>

          <Card
            title="Live data source"
            subtitle="Where BTCUSDT candles and ticks are streamed from"
            action={<Radio size={15} className="text-primary" aria-hidden="true" />}
          >
            <div className="space-y-2">
              <div role="radiogroup" aria-label="Live data source" className="space-y-1.5">
                {DATA_SOURCES.map((s) => {
                  const selected = settings.dataSource === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => update({ dataSource: s.id })}
                      className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-all duration-150 active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        selected ? 'border-primary bg-primary/10' : 'border-border bg-secondary hover:border-primary/40'
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                          selected ? 'border-primary bg-primary' : 'border-muted-foreground'
                        }`}
                        aria-hidden="true"
                      >
                        {selected && <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[13px] font-semibold text-foreground">{s.label}</span>
                        <span className="block truncate text-[11px] text-muted-foreground">{s.description}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <div
                role="status"
                className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs ${
                  market.status === 'live' ?'border-success/30 bg-success/10 text-success'
                    : market.status === 'error' ?'border-destructive/30 bg-destructive/10 text-destructive' :'border-warning/30 bg-warning/10 text-warning'
                }`}
              >
                <span
                  className={`live-dot h-1.5 w-1.5 rounded-full ${
                    market.status === 'live' ? 'bg-success' : market.status === 'error' ? 'bg-destructive' : 'bg-warning'
                  }`}
                  aria-hidden="true"
                />
                {market.status === 'live' && `Connected to ${source.label}`}
                {market.status === 'connecting' && `Connecting to ${source.label}…`}
                {market.status === 'reconnecting' && `Reconnecting to ${source.label}…`}
                {market.status === 'stale' && `${source.label} feed is stale`}
                {market.status === 'error' && `${source.label} unreachable: ${market.error}. Try another source.`}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
