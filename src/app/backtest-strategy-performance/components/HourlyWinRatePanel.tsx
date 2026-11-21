'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import Card from '@/components/ui/Card';
import ChartSkeleton from './ChartSkeleton';
import type { BacktestResult } from '@/lib/backtestEngine';

const HourlyChartClient = dynamic(() => import('./HourlyChartClient'), {
  ssr: false,
  loading: () => <ChartSkeleton height={230} />,
});

function tone(v: number | null) {
  if (v === null) return 'text-muted-foreground';
  return v >= 60 ? 'text-success' : v >= 50 ? 'text-foreground' : 'text-warning';
}

export default function HourlyWinRatePanel({ loading, result }: { loading: boolean; result: BacktestResult }) {
  const s = result.sessions;
  const items: Array<{ label: string; v: number | null }> = [
    { label: 'Asia', v: s.Asia },
    { label: 'London', v: s.London },
    { label: 'New York', v: s['New York'] },
  ];
  return (
    <Card title="Win rate by hour (UTC)" subtitle="2-hour buckets from replayed trades · dashed line = 50%" bodyClassName="p-3">
      {loading ? <ChartSkeleton height={230} /> : <HourlyChartClient data={result.hourly} />}
      <div className="mt-2 grid grid-cols-3 gap-2 border-t border-border pt-3 text-xs">
        {items.map((it) => (
          <div key={it.label}>
            <p className="label-xs">{it.label}</p>
            <p className={`num mt-0.5 font-semibold ${tone(it.v)}`}>{it.v !== null ? `${it.v}%` : '—'}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}