import React from 'react';
import { CalendarCheck2 } from 'lucide-react';
import type { LiveAnalysis } from '@/lib/liveAnalysis';

interface TodayQuickViewTileProps {
  analysis: LiveAnalysis | null;
}

export default function TodayQuickViewTile({ analysis }: TodayQuickViewTileProps) {
  const s = analysis?.session;
  const closed = s ? s.wins + s.losses : null;
  const netR = s?.netR ?? null;
  const winRate = s?.winRate ?? null;

  const pnlTone = netR === null ? 'text-foreground' : netR > 0 ? 'text-success' : netR < 0 ? 'text-destructive' : 'text-foreground';
  const winTone = winRate === null ? 'text-foreground' : winRate >= 50 ? 'text-success' : 'text-destructive';

  return (
    <section
      aria-label="Today's quick view"
      className="rounded-xl border border-border bg-gradient-to-b from-card to-muted/60 px-3 py-3"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarCheck2 size={14} className="text-primary" aria-hidden="true" />
          <h2 className="text-[13px] font-semibold text-foreground">Today&apos;s Quick View</h2>
        </div>
        <span className="text-[11px] text-muted-foreground">Since 00:00 UTC</span>
      </div>
      <dl className="grid grid-cols-3 divide-x divide-border">
        <div className="px-3 first:pl-0">
          <dt className="label-xs">Closed trades</dt>
          <dd className="num mt-1 text-2xl font-bold leading-none text-foreground">{closed !== null ? closed : '—'}</dd>
          <p className="mt-1 truncate text-[11px] text-muted-foreground">
            {s ? `${s.wins}W · ${s.losses}L${s.active > 0 ? ` · ${s.active} open` : ''}` : 'Waiting for live data'}
          </p>
        </div>
        <div className="px-3">
          <dt className="label-xs">Cumulative P&amp;L</dt>
          <dd className={`num mt-1 text-2xl font-bold leading-none ${pnlTone}`}>
            {netR !== null ? `${netR >= 0 ? '+' : ''}${netR.toFixed(2)}R` : '—'}
          </dd>
          <p className="mt-1 truncate text-[11px] text-muted-foreground">
            {closed ? `Avg ${netR !== null && netR / closed >= 0 ? '+' : ''}${((netR ?? 0) / closed).toFixed(2)}R per trade` : 'No closed trades yet'}
          </p>
        </div>
        <div className="px-3">
          <dt className="label-xs">Session win rate</dt>
          <dd className={`num mt-1 text-2xl font-bold leading-none ${winTone}`}>
            {winRate !== null ? `${winRate}%` : '—'}
          </dd>
          <p className="mt-1 truncate text-[11px] text-muted-foreground">
            {s ? `${s.wins} of ${closed} resolved` : 'Waiting for live data'}
          </p>
        </div>
      </dl>
    </section>
  );
}
