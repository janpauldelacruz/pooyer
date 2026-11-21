import React from 'react';
import { Layers, TrendingUp, Zap, Undo2 } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { MODULE_LABELS, ModuleKey } from '@/lib/types';
import type { LiveAnalysis } from '@/lib/liveAnalysis';

const ICONS: Record<ModuleKey, React.ReactNode> = {
  confluence: <Layers size={16} />,
  pullback: <TrendingUp size={16} />,
  breakout: <Zap size={16} />,
  meanrev: <Undo2 size={16} />,
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
      subtitle="All four engines feed one combined signal"
      className="h-full"
      bodyClassName="p-3"
    >
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {(tiles.length ? tiles : KEYS.map((key) => null)).map((m, idx) => {
          const key = m?.key ?? KEYS[idx];
          return (
            <div
              key={key}
              className={`rounded-lg border p-3 transition-all duration-150 hover:border-primary/40 ${
                m?.state === 'Armed' ? 'border-success/30 bg-success/5'
                  : m?.state === 'Cooling' ? 'border-warning/30 bg-warning/5' : 'border-border bg-muted/50'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-muted-foreground">{ICONS[key]}</span>
                <Badge tone={m ? STATE_TONE[m.state] : 'neutral'} dot>{m ? m.state : 'Loading'}</Badge>
              </div>
              <p className="mt-2 truncate text-sm font-semibold text-foreground">{MODULE_LABELS[key]}</p>
              <p className="mt-0.5 line-clamp-2 min-h-[32px] text-xs text-muted-foreground">
                {m ? m.note : 'Waiting for live data…'}
              </p>
              <div className="num mt-2 flex items-center justify-between border-t border-border pt-2 text-xs">
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