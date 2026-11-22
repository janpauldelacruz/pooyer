import React from 'react';
import { Layers, TrendingUp, Zap, Undo2 } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { MODULE_LABELS, ModuleKey } from '@/lib/types';
import type { LiveAnalysis } from '@/lib/liveAnalysis';

const ICONS: Record<ModuleKey, React.ReactNode> = {
  confluence: <Layers size={14} aria-hidden="true" />,
  pullback: <TrendingUp size={14} aria-hidden="true" />,
  breakout: <Zap size={14} aria-hidden="true" />,
  meanrev: <Undo2 size={14} aria-hidden="true" />,
};

const STATE_TONE = {
  Armed: 'long',
  Watching: 'info',
  Cooling: 'warn',
  Disabled: 'neutral',
} as const;

const KEYS: ModuleKey[] = ['confluence', 'pullback', 'breakout', 'meanrev'];

export default function ModuleStatusGrid({ analysis }: { analysis: LiveAnalysis | null }) {
  const tiles = analysis?.modules ?? [];

  return (
    <Card
      title="Strategy modules"
      subtitle="Four engines feed one combined signal"
      className="h-full"
      bodyClassName="p-2.5"
    >
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {(tiles.length ? tiles : KEYS.map(() => null)).map((m, idx) => {
          const key = m?.key ?? KEYS[idx];
          return (
            <div
              key={key}
              className={`rounded-lg border p-2.5 transition-all duration-150 hover:border-primary/50 ${
                m?.state === 'Armed' ? 'border-success/40 bg-success/10'
                  : m?.state === 'Cooling' ? 'border-warning/35 bg-warning/5' : 'border-border bg-muted/50'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-primary">{ICONS[key]}</span>
                <Badge tone={m ? STATE_TONE[m.state] : 'neutral'} dot>{m ? m.state : 'Loading'}</Badge>
              </div>
              <p className="mt-1.5 truncate text-[13px] font-semibold text-foreground">{MODULE_LABELS[key]}</p>
              <p className="line-clamp-2 min-h-[28px] text-[11px] text-muted-foreground">
                {m ? m.note : 'Waiting for live data…'}
              </p>
              <div className="num mt-1.5 flex items-center justify-between border-t border-border pt-1.5 text-[11px]">
                <span className="text-muted-foreground">
                  Win <span className="font-semibold text-foreground">{m?.winRate !== null && m?.winRate !== undefined ? `${m.winRate}%` : '—'}</span>
                </span>
                <span className="text-muted-foreground">
                  Today <span className="font-semibold text-foreground">{m ? m.signalsToday : '—'}</span>
                </span>
                <span className="text-muted-foreground">{m ? m.lastSignal : '—'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}