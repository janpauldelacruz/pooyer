import React from 'react';
import { Percent, Scale, Sigma, TrendingDown, Hash, Ratio, Activity } from 'lucide-react';
import MetricTile from '@/components/ui/MetricTile';
import type { BacktestResult } from '@/lib/backtestEngine';

interface BacktestKpiGridProps {
  loading: boolean;
  result: BacktestResult;
}

export default function BacktestKpiGrid({ loading, result }: BacktestKpiGridProps) {
  const k = result.kpis;

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 2xl:grid-cols-8">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={`kpi-skel-${i + 1}`} className="h-[104px] animate-pulse rounded-xl border border-border bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 2xl:grid-cols-8">
      <MetricTile
        label="Win rate"
        value={`${k.winRate}%`}
        sub={`${k.wins} wins / ${k.losses} losses`}
        tone={k.winRate >= 50 ? 'good' : 'bad'}
        icon={<Percent size={15} />}
        className="col-span-2 md:col-span-2 2xl:col-span-2"
      />
      <MetricTile label="Profit factor" value={k.profitFactor.toFixed(2)} sub="Gross win / gross loss" tone={k.profitFactor >= 1 ? 'good' : 'bad'} icon={<Scale size={15} />} />
      <MetricTile label="Expectancy" value={`${k.expectancy >= 0 ? '+' : ''}${k.expectancy.toFixed(2)}R`} sub="Per trade after costs" tone={k.expectancy >= 0 ? 'good' : 'bad'} icon={<Sigma size={15} />} />
      <MetricTile label="Max drawdown" value={`−${k.maxDrawdown}%`} sub="Peak to trough on the replayed period" tone="warn" icon={<TrendingDown size={15} />} />
      <MetricTile label="Total trades" value={k.totalTrades.toLocaleString('en-US')} sub={`${k.tradesPerDay} per day average`} icon={<Hash size={15} />} />
      <MetricTile label="Avg R:R" value={`1:${k.avgRR.toFixed(2)}`} sub="Realized avg win / avg loss" icon={<Ratio size={15} />} />
      <MetricTile label="Sharpe" value={k.sharpe.toFixed(2)} sub={`Hold ${k.avgHoldMin}m avg`} icon={<Activity size={15} />} />
    </div>
  );
}