import React from 'react';
import { CheckCircle2, XCircle, Hourglass } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import type { LiveAnalysis } from '@/lib/liveAnalysis';

export default function ConfluenceChecklist({ analysis }: { analysis: LiveAnalysis | null }) {
  const checks = analysis?.checks ?? [];
  const passed = checks.filter((c) => c.pass);
  const score = passed.reduce((a, c) => a + c.weight, 0);
  const total = checks.reduce((a, c) => a + c.weight, 0);
  const failed = checks.filter((c) => !c.pass);
  const bias = analysis?.evaluation?.bias;

  return (
    <Card
      title="Confluence checklist"
      subtitle={`Live conditions on the latest candle${bias ? ` · ${bias === 'LONG' ? 'bullish' : 'bearish'} bias` : ''}`}
      action={checks.length > 0 ? <Badge tone="long">{passed.length}/{checks.length} aligned</Badge> : undefined}
      className="h-full"
      bodyClassName="p-0"
    >
      {checks.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-muted-foreground">
          <Hourglass size={20} />
          Waiting for enough live candles to evaluate conditions…
        </div>
      ) : (
        <>
          <ul className="divide-y divide-border">
            {checks.map((c) => (
              <li
                key={c.id}
                className={`flex items-start gap-3 px-4 py-3 transition-colors duration-150 hover:bg-muted/50 ${c.pass ? '' : 'bg-warning/5'}`}
              >
                {c.pass ? (
                  <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-success" />
                ) : (
                  <XCircle size={17} className="mt-0.5 shrink-0 text-warning" />
                )}
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium ${c.pass ? 'text-foreground' : 'text-warning'}`}>{c.label}</p>
                  <p className="num truncate text-xs text-muted-foreground">{c.detail}</p>
                </div>
                <span className={`num shrink-0 text-xs font-semibold ${c.pass ? 'text-success' : 'text-muted-foreground'}`}>
                  {c.pass ? `+${c.weight}` : `0/${c.weight}`}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-border bg-muted/40 px-4 py-3">
            <div>
              <p className="label-xs">Raw alignment score</p>
              <p className="num mt-0.5 text-lg font-bold text-foreground">
                {score}
                <span className="text-sm font-medium text-muted-foreground"> / {total}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="label-xs">Missing</p>
              <p className="mt-0.5 text-xs font-medium text-warning">
                {failed.length === 0 ? 'Nothing — fully aligned' : `${failed.length} check${failed.length > 1 ? 's' : ''} (−${failed.reduce((a, c) => a + c.weight, 0)})`}
              </p>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}