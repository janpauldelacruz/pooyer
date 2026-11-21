import React from 'react';
import { Flame, Snowflake, ArrowUpCircle, ArrowDownCircle, RotateCcw } from 'lucide-react';
import Card from '@/components/ui/Card';
import type { BacktestResult } from '@/lib/backtestEngine';

export default function StreakStatsPanel({ result }: { result: BacktestResult }) {
  const s = result.streaks;
  const items = [
    { id: 'st-win', label: 'Max win streak', value: `${s.maxWinStreak}`, tone: 'text-success', icon: <Flame size={16} className="text-success" /> },
    { id: 'st-loss', label: 'Max loss streak', value: `${s.maxLossStreak}`, tone: 'text-destructive', icon: <Snowflake size={16} className="text-destructive" /> },
    { id: 'st-avgw', label: 'Avg win', value: `+${s.avgWinR.toFixed(2)}R`, tone: 'text-success', icon: <ArrowUpCircle size={16} className="text-success" /> },
    { id: 'st-avgl', label: 'Avg loss', value: `${s.avgLossR.toFixed(2)}R`, tone: 'text-destructive', icon: <ArrowDownCircle size={16} className="text-destructive" /> },
    { id: 'st-bigw', label: 'Largest win', value: `+${s.largestWinR.toFixed(2)}R`, tone: 'text-success', icon: <ArrowUpCircle size={16} className="text-success" /> },
    { id: 'st-bigl', label: 'Largest loss', value: `${s.largestLossR.toFixed(2)}R`, tone: 'text-destructive', icon: <ArrowDownCircle size={16} className="text-destructive" /> },
  ];

  return (
    <Card title="Streaks & risk of ruin" subtitle="What the worst runs looked like" className="h-full">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3">
        {items.map((it) => (
          <div key={it.id} className="rounded-lg border border-border bg-muted/50 p-3">
            <div className="flex items-center justify-between">
              <p className="label-xs">{it.label}</p>
              {it.icon}
            </div>
            <p className={`num mt-1.5 text-xl font-bold ${it.tone}`}>{it.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
        <RotateCcw size={15} className="mt-0.5 shrink-0" />
        <p>
          The longest losing streak in this live window was {s.maxLossStreak} trades. Keep the daily loss limit at −4R and
          pause after 3 consecutive stops.
        </p>
      </div>
    </Card>
  );
}