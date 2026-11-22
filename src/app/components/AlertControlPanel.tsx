'use client';

import React from 'react';
import { Volume2, BellRing, PlayCircle } from 'lucide-react';
import Card from '@/components/ui/Card';
import Toggle from '@/components/ui/Toggle';
import type { AlertSettings } from './LiveSignalDashboard';

interface AlertControlPanelProps {
  settings: AlertSettings;
  onChange: (next: AlertSettings) => void;
  onTest: (side: 'LONG' | 'SHORT') => void;
}

export default function AlertControlPanel({ settings, onChange, onTest }: AlertControlPanelProps) {
  const set = <K extends keyof AlertSettings>(key: K, value: AlertSettings[K]) =>
    onChange({ ...settings, [key]: value });

  return (
    <Card
      title="Alert controls"
      subtitle="Sound and on-screen notifications"
      action={<BellRing size={15} className="text-primary" aria-hidden="true" />}
      className="h-full"
    >
      <div className="space-y-3">
        <Toggle
          id="tg-sound"
          checked={settings.sound}
          onChange={(v) => set('sound', v)}
          label="Sound alerts"
          description="Rising two-tone for long, falling for short"
        />

        <div className={`transition-opacity duration-150 ${settings.sound ? 'opacity-100' : 'opacity-50'}`}>
          <div className="flex items-center justify-between">
            <label htmlFor="vol" className="flex items-center gap-1.5 text-[13px] font-medium text-foreground">
              <Volume2 size={13} aria-hidden="true" /> Volume
            </label>
            <span className="num text-xs font-semibold text-muted-foreground">{settings.volume}%</span>
          </div>
          <input
            id="vol"
            type="range"
            min={0}
            max={100}
            value={settings.volume}
            disabled={!settings.sound}
            onChange={(e) => set('volume', Number(e.target.value))}
            className="mt-1.5 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-primary disabled:cursor-not-allowed"
          />
        </div>

        <Toggle
          id="tg-toast"
          checked={settings.toasts}
          onChange={(v) => set('toasts', v)}
          label="On-screen alerts"
          description="Toast with entry, SL and TP"
        />

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="minconf" className="text-[13px] font-medium text-foreground">Minimum confidence</label>
            <span className="num rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
              ≥ {settings.minConfidence}
            </span>
          </div>
          <input
            id="minconf"
            type="range"
            min={50}
            max={95}
            step={5}
            value={settings.minConfidence}
            onChange={(e) => set('minConfidence', Number(e.target.value))}
            className="mt-1.5 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Only signals scored at or above this confidence trigger alerts. See the Backtest page for measured results.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => set('longs', !settings.longs)}
            aria-pressed={settings.longs}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all duration-150 active:scale-95 ${
              settings.longs
                ? 'border-success/50 bg-success/15 text-success' :'border-border bg-secondary text-muted-foreground'
            }`}
          >
            Longs {settings.longs ? 'on' : 'off'}
          </button>
          <button
            type="button"
            onClick={() => set('shorts', !settings.shorts)}
            aria-pressed={settings.shorts}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all duration-150 active:scale-95 ${
              settings.shorts
                ? 'border-destructive/50 bg-destructive/15 text-destructive' :'border-border bg-secondary text-muted-foreground'
            }`}
          >
            Shorts {settings.shorts ? 'on' : 'off'}
          </button>
        </div>

        <div className="flex gap-2 border-t border-border pt-2.5">
          <button
            type="button"
            onClick={() => onTest('LONG')}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1.5 text-xs font-semibold text-secondary-foreground transition-all duration-150 hover:bg-muted active:scale-95"
          >
            <PlayCircle size={13} aria-hidden="true" /> Test long
          </button>
          <button
            type="button"
            onClick={() => onTest('SHORT')}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1.5 text-xs font-semibold text-secondary-foreground transition-all duration-150 hover:bg-muted active:scale-95"
          >
            <PlayCircle size={13} aria-hidden="true" /> Test short
          </button>
        </div>
      </div>
    </Card>
  );
}