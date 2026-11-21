'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import Card from '@/components/ui/Card';
import ChartSkeleton from './ChartSkeleton';
import type { BacktestResult } from '@/lib/backtestEngine';

const RDistChartClient = dynamic(() => import('./RDistChartClient'), {
  ssr: false,
  loading: () => <ChartSkeleton height={230} />,
});

export default function RDistributionPanel({ loading, result }: { loading: boolean; result: BacktestResult }) {
  const r = result.rStats;
  return (
    <Card title="R-multiple distribution" subtitle="Outcome of every replayed trade in units of initial risk" bodyClassName="p-3">
      {loading ? <ChartSkeleton height={230} /> : <RDistChartClient data={result.rDist} />}
      <div className="mt-2 grid grid-cols-3 gap-2 border-t border-border pt-3 text-xs">
        <div>
          <p className="label-xs">Median</p>
          <p className="num mt-0.5 font-semibold text-foreground">{r.median >= 0 ? '+' : ''}{r.median.toFixed(2)}R</p>
        </div>
        <div>
          <p className="label-xs">Tail loss</p>
          <p className="num mt-0.5 font-semibold text-destructive">{r.tailLoss.toFixed(2)}R</p>
        </div>
        <div>
          <p className="label-xs">≥ +1.75R trades</p>
          <p className="num mt-0.5 font-semibold text-success">{r.pctTwoR}%</p>
        </div>
      </div>
    </Card>
  );
}