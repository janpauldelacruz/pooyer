'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import BacktestHeader from './BacktestHeader';
import BacktestKpiGrid from './BacktestKpiGrid';
import EquityPanel from './EquityPanel';
import ModuleComparePanel from './ModuleComparePanel';
import HourlyWinRatePanel from './HourlyWinRatePanel';
import RDistributionPanel from './RDistributionPanel';
import CalibrationPanel from './CalibrationPanel';
import MonthlyReturnsGrid from './MonthlyReturnsGrid';
import StreakStatsPanel from './StreakStatsPanel';
import ParameterPanel from './ParameterPanel';
import BacktestTradesTable from './BacktestTradesTable';
import { BacktestParams, RawKline } from '@/lib/types';
import { fetchHistoricalKlines } from '@/lib/useLiveMarket';
import { BacktestResult, DEFAULT_PARAMS, runBacktest } from '@/lib/backtestEngine';

const RANGE_BARS: Record<string, number> = {
  '1d': 1440,
  '3d': 4320,
  '7d': 10080,
  '14d': 20160,
};

export default function BacktestPerformance() {
  const [running, setRunning] = useState(false);
  const [range, setRange] = useState('3d');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastParams, setLastParams] = useState<BacktestParams>(DEFAULT_PARAMS);
  const cache = useRef<{ bars: number; klines: RawKline[] } | null>(null);
  const started = useRef(false);

  const execute = useCallback(async (params: BacktestParams, rangeKey: string, notify: boolean) => {
    setRunning(true);
    setError(null);
    try {
      const bars = RANGE_BARS[rangeKey] ?? 4320;
      let klines: RawKline[];
      if (cache.current && cache.current.bars >= bars && notify === false) {
        klines = cache.current.klines.slice(-bars);
      } else {
        klines = await fetchHistoricalKlines(bars);
        cache.current = { bars, klines };
      }
      // allow the UI to paint the running state before the CPU-heavy replay
      await new Promise((r) => setTimeout(r, 30));
      const res = runBacktest(klines, params);
      setLastParams(params);
      if (!res) {
        setResult(null);
        setError('No trades were generated from the live BTCUSD history with these parameters. Try lowering min confidence or widening the range.');
      } else {
        setResult(res);
        if (notify) {
          toast.success('Backtest complete', {
            description: `${res.kpis.totalTrades} trades replayed on ${res.bars.toLocaleString('en-US')} live 1m candles · min confidence ${params.minConfidence} · SL ${params.slAtr}× ATR`,
          });
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load live BTCUSD history');
    } finally {
      setRunning(false);
    }
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    execute(DEFAULT_PARAMS, '3d', false);
  }, [execute]);

  const handleRange = (v: string) => {
    setRange(v);
    execute(lastParams, v, false);
  };

  const handleRun = (params: BacktestParams) => {
    execute(params, range, true);
  };

  return (
    <AppLayout title="Backtest & Strategy Performance">
      <div className="space-y-3">
        <BacktestHeader
          range={range}
          onRange={handleRange}
          moduleFilter={moduleFilter}
          onModule={setModuleFilter}
          running={running}
          result={result}
        />

        {error && !running && (
          <div role="alert" className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">{error}</div>
        )}

        {!result && running && (
          <div role="status" className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-12 text-sm text-muted-foreground">
            <Loader2 size={16} className="animate-spin" aria-hidden="true" /> Loading live BTCUSD history and replaying the strategy…
          </div>
        )}

        {result && (
          <>
            <BacktestKpiGrid loading={running} result={result} />

            <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
              <div className="xl:col-span-8">
                <EquityPanel loading={running} result={result} />
              </div>
              <div className="xl:col-span-4">
                <ModuleComparePanel loading={running} result={result} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
              <HourlyWinRatePanel loading={running} result={result} />
              <RDistributionPanel loading={running} result={result} />
              <div className="lg:col-span-2 2xl:col-span-1">
                <CalibrationPanel loading={running} result={result} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
              <div className="xl:col-span-7">
                <MonthlyReturnsGrid result={result} />
              </div>
              <div className="space-y-3 xl:col-span-5">
                <StreakStatsPanel result={result} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
              <div className="xl:col-span-8">
                <BacktestTradesTable moduleFilter={moduleFilter} trades={result.trades} />
              </div>
              <div className="xl:col-span-4">
                <ParameterPanel running={running} onRun={handleRun} />
              </div>
            </div>
          </>
        )}

        {!result && !running && (
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
            <div className="xl:col-span-8" />
            <div className="xl:col-span-4">
              <ParameterPanel running={running} onRun={handleRun} />
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}