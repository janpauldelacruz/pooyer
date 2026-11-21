import React from 'react';
import { Trophy, Percent, Flame, Clock3 } from 'lucide-react';
import MetricTile from '@/components/ui/MetricTile';
import type { LiveAnalysis } from '@/lib/liveAnalysis';

export default function SessionStatsStrip({ analysis }: { analysis: LiveAnalysis | null }) {
  const s = analysis?.session;
  const resolved = s ? s.wins + s.losses : 0;
  const avg = s && resolved > 0 ? s.netR / resolved : null;
  const lossStreak = s?.consecutiveLosses ?? 0;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <MetricTile
        label="Signals today"
        value={s ? `${s.signalsToday}` : '—'}
        sub={s ? `Since 00:00 UTC · ${s.active} still active` : 'Waiting for live data'}
        icon={<Clock3 size={15} />}
      />
      <MetricTile
        label="Session win rate"
        value={s?.winRate !== null && s?.winRate !== undefined ? `${s.winRate}%` : '—'}
        sub={s ? `${s.wins} wins of ${resolved} resolved` : 'Waiting for live data'}
        tone={s?.winRate !== null && s?.winRate !== undefined ? (s.winRate >= 50 ? 'good' : 'bad') : 'default'}
        icon={<Percent size={15} />}
      />
      <MetricTile
        label="Net result"
        value={s ? `${s.netR >= 0 ? '+' : ''}${s.netR.toFixed(1)}R` : '—'}
        sub={avg !== null ? `Avg ${avg >= 0 ? '+' : ''}${avg.toFixed(2)}R per resolved signal` : 'No resolved signals yet'}
        tone={s ? (s.netR > 0 ? 'good' : s.netR < 0 ? 'bad' : 'default') : 'default'}
        icon={<Trophy size={15} />}
      />
      <MetricTile
        label="Heat check"
        value={s ? (lossStreak > 0 ? `${lossStreak} SL in a row` : 'Clear') : '—'}
        sub={lossStreak >= 3 ? 'Circuit breaker: pause trading' : lossStreak > 0 ? 'Watch risk closely' : 'No consecutive stop-outs'}
        tone={lossStreak >= 2 ? 'warn' : 'default'}
        icon={<Flame size={15} />}
      />
    </div>
  );
}