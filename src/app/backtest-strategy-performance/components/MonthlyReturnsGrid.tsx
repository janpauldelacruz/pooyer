import React from 'react';
import Card from '@/components/ui/Card';
import type { BacktestResult } from '@/lib/backtestEngine';

function cellClass(v: number) {
  if (v === 0) return 'border-border bg-muted text-muted-foreground';
  if (v >= 6) return 'border-success/40 bg-success/25 text-success';
  if (v > 0) return 'border-success/25 bg-success/10 text-success';
  if (v <= -4) return 'border-destructive/40 bg-destructive/25 text-destructive';
  return 'border-destructive/25 bg-destructive/10 text-destructive';
}

export default function MonthlyReturnsGrid({ result }: { result: BacktestResult }) {
  const months = result.monthly;
  const total = months.reduce((a, m) => a + m.value, 0);
  const positive = months.filter((m) => m.value > 0).length;

  return (
    <Card
      title="Returns by calendar month"
      subtitle={`Sum of replayed trade R × ${result.params.riskPct}% risk · only months inside the loaded live window`}
      action={
        <div className="num text-right">
          <p className={`text-lg font-bold ${total >= 0 ? 'text-success' : 'text-destructive'}`}>{total >= 0 ? '+' : ''}{total.toFixed(2)}%</p>
          <p className="text-[11px] text-muted-foreground">{positive}/{months.length} periods green</p>
        </div>
      }
      className="h-full"
    >
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {months.map((m) => (
          <div
            key={m.id}
            className={`rounded-lg border p-3 text-center transition-all duration-150 hover:scale-[1.03] ${cellClass(m.value)}`}
          >
            <p className="label-xs">{m.label}</p>
            <p className="num mt-1 text-lg font-bold">
              {m.value === 0 ? '—' : `${m.value > 0 ? '+' : ''}${m.value.toFixed(2)}%`}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Live 1m history is limited to the selected range, so only the calendar months it spans are shown. Choose a longer range for more periods.
      </p>
    </Card>
  );
}