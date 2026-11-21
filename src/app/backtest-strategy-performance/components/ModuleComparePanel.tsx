'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import ChartSkeleton from './ChartSkeleton';
import type { BacktestResult } from '@/lib/backtestEngine';

const ModuleCompareChartClient = dynamic(() => import('./ModuleCompareChartClient'), {
  ssr: false,
  loading: () => <ChartSkeleton height={250} />,
});

export default function ModuleComparePanel({ loading, result }: { loading: boolean; result: BacktestResult }) {
  const stats = result.moduleStats;
  const active = stats.filter((m) => m.trades > 0);
  const weakest = active.length > 1 ? active.reduce((a, b) => (a.winRate <= b.winRate ? a : b)).key : null;
  return (
    <Card
      title="Win rate by module"
      subtitle="Which engine carries the edge"
      className="h-full"
      bodyClassName="p-3"
    >
      {loading ? <ChartSkeleton height={250} /> : <ModuleCompareChartClient data={stats} />}
      <ul className="mt-2 divide-y divide-border border-t border-border">
        {stats.map((m) => (
          <li key={m.id} className="flex items-center justify-between py-2 text-xs">
            <span className="font-medium text-foreground">{m.module}</span>
            <span className="num flex items-center gap-3 text-muted-foreground">
              <span>PF <span className="font-semibold text-foreground">{m.trades ? m.profitFactor.toFixed(2) : '—'}</span></span>
              <span>{m.trades} trades</span>
              {weakest === m.key && <Badge tone="warn">Weakest</Badge>}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}