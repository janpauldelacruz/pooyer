'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import Card from '@/components/ui/Card';
import ChartSkeleton from './ChartSkeleton';
import type { BacktestResult } from '@/lib/backtestEngine';

const CalibrationChartClient = dynamic(() => import('./CalibrationChartClient'), {
  ssr: false,
  loading: () => <ChartSkeleton height={230} />,
});

export default function CalibrationPanel({ loading, result }: { loading: boolean; result: BacktestResult }) {
  const cal = result.calibration;
  const first = cal[0];
  const last = cal[cal.length - 1];
  let note = 'Not enough trades across confidence tiers to judge calibration yet.';
  if (cal.length >= 2 && first && last) {
    note =
      last.winRate > first.winRate
        ? `Win rate rises with score: ${first.winRate}% at ${first.bucket} up to ${last.winRate}% at ${last.bucket}.`
        : `Win rate does not rise with score in this window: ${first.winRate}% at ${first.bucket} vs ${last.winRate}% at ${last.bucket}.`;
  }
  return (
    <Card
      title="Confidence calibration"
      subtitle="Does a higher score really win more? Bars = sample size"
      bodyClassName="p-3"
    >
      {loading ? <ChartSkeleton height={230} /> : <CalibrationChartClient data={cal} />}
      <div className="mt-2 rounded-lg border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">{note}</div>
    </Card>
  );
}