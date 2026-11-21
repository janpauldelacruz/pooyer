'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { Play, Loader2, RotateCcw } from 'lucide-react';
import Card from '@/components/ui/Card';
import Toggle from '@/components/ui/Toggle';
import { BacktestParams } from '@/lib/types';
import { DEFAULT_PARAMS } from '@/lib/backtestEngine';

export type { BacktestParams };

const DEFAULTS: BacktestParams = DEFAULT_PARAMS;

interface ParameterPanelProps {
  running: boolean;
  onRun: (p: BacktestParams) => void;
}

export default function ParameterPanel({ running, onRun }: ParameterPanelProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<BacktestParams>({ defaultValues: DEFAULTS });

  const htf = watch('htfFilter');
  const news = watch('newsBlackout');

  const numField = (
    id: string,
    label: string,
    name: keyof BacktestParams,
    hint: string,
    opts: { min: number; max: number; step?: number }
  ) => (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-foreground">{label}</label>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <input
        id={id}
        type="number"
        step={opts.step ?? 1}
        {...register(name, {
          valueAsNumber: true,
          required: `${label} is required`,
          min: { value: opts.min, message: `Minimum is ${opts.min}` },
          max: { value: opts.max, message: `Maximum is ${opts.max}` },
        })}
        className={`num mt-1.5 w-full rounded-lg border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 ${
          errors[name] ? 'border-destructive focus:ring-destructive' : 'border-border focus:border-primary focus:ring-ring'
        }`}
      />
      {errors[name] && <p className="mt-1 text-xs text-destructive">{errors[name]?.message as string}</p>}
    </div>
  );

  return (
    <Card title="Strategy parameters" subtitle="Tune the rules, then replay real 1m candles" className="h-full">
      <form onSubmit={handleSubmit(onRun)} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-3">
          {numField('p-conf', 'Min confidence', 'minConfidence', 'Skip signals below', { min: 50, max: 95, step: 5 })}
          {numField('p-sl', 'Stop (× ATR)', 'slAtr', 'Stop distance', { min: 0.5, max: 3, step: 0.1 })}
          {numField('p-tp1', 'TP1 (R)', 'tp1R', 'First target', { min: 0.5, max: 3, step: 0.1 })}
          {numField('p-tp2', 'TP2 (R)', 'tp2R', 'Runner target', { min: 1, max: 6, step: 0.1 })}
          {numField('p-spread', 'Spread', 'spread', 'USD per fill', { min: 0, max: 10, step: 0.1 })}
          {numField('p-slip', 'Slippage', 'slippage', 'USD per fill', { min: 0, max: 10, step: 0.1 })}
          {numField('p-risk', 'Risk per trade %', 'riskPct', 'Of account equity', { min: 0.1, max: 5, step: 0.1 })}
          {numField('p-max', 'Max trades / day', 'maxTradesPerDay', 'Daily cap', { min: 1, max: 60 })}
        </div>

        <div className="space-y-3 border-t border-border pt-3">
          <Toggle
            id="p-htf"
            checked={htf}
            onChange={(v) => setValue('htfFilter', v, { shouldDirty: true })}
            label="Higher-timeframe filter"
            description="Only trade with 5m and 15m EMA bias"
          />
          <Toggle
            id="p-news"
            checked={news}
            onChange={(v) => setValue('newsBlackout', v, { shouldDirty: true })}
            label="News blackout"
            description="Not available — no live economic calendar feed connected"
          />
        </div>

        <div className="sticky bottom-0 flex gap-2 border-t border-border bg-card pt-3">
          <button
            type="submit"
            disabled={running}
            className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-all duration-150 hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {running ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            {running ? 'Running' : 'Run Backtest'}
          </button>
          <button
            type="button"
            onClick={() => reset(DEFAULTS)}
            disabled={!isDirty || running}
            className="flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-secondary px-3 text-sm font-semibold text-secondary-foreground transition-all duration-150 hover:bg-muted active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RotateCcw size={15} /> Reset
          </button>
        </div>
        {isDirty && !running && (
          <p className="slide-in text-xs text-warning">Unsaved parameter changes — run the backtest to apply them.</p>
        )}
      </form>
    </Card>
  );
}