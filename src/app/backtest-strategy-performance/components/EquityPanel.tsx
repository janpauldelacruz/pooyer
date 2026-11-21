'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import Card from '@/components/ui/Card';
import ChartSkeleton from './ChartSkeleton';
import type { BacktestResult } from '@/lib/backtestEngine';

const EquityChartClient = dynamic(() => import('./EquityChartClient'), {
  ssr: false,
  loading: () => <ChartSkeleton height={340} />,
});

export default function EquityPanel({ loading, result }: { loading: boolean; result: BacktestResult }) {
  const data = result.equity;
  const last = data[data.length - 1];
  const worst = Math.min(...data.map((d) => d.drawdown), 0);
  const gain = last ? last.equity - 100 : 0;
  const w = result.weekly;

  return (
    <Card
      title="Equity curve & drawdown"
      subtitle={`Starting equity 100 · ${result.params.riskPct}% risk per 1R · costs included · one point per trade`}
      action={
        <div className="num text-right">
          <p className={`text-lg font-bold ${gain >= 0 ? 'text-success' : 'text-destructive'}`}>{gain >= 0 ? '+' : ''}{gain.toFixed(2)}%</p>
          <p className="text-[11px] text-destructive">worst {worst.toFixed(2)}%</p>
        </div>
      }
      className="h-full"
      bodyClassName="p-3"
    >
      {loading ? <ChartSkeleton height={340} /> : <EquityChartClient data={data} />}
      <div className="mt-2 grid grid-cols-3 gap-2 border-t border-border pt-3 text-xs">
        <div>
          <p className="label-xs">Best week</p>
          <p className="num mt-0.5 font-semibold text-success">{w.total ? `${w.best >= 0 ? '+' : ''}${w.best.toFixed(2)}%` : '—'}</p>
        </div>
        <div>
          <p className="label-xs">Worst week</p>
          <p className="num mt-0.5 font-semibold text-destructive">{w.total ? `${w.worst >= 0 ? '+' : '−'}${Math.abs(w.worst).toFixed(2)}%` : '—'}</p>
        </div>
        <div>
          <p className="label-xs">Profitable weeks</p>
          <p className="num mt-0.5 font-semibold text-foreground">{w.total ? `${w.profitable} of ${w.total}` : '—'}</p>
        </div>
      </div>
    </Card>
  );
}