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
      subtitle={`Latest closed candle${bias ? ` · ${bias === 'LONG' ? 'bullish' : 'bearish'} bias` : ''}`}
      action={checks.length > 0 ? <Badge tone="long">{passed.length}/{checks.length} aligned</Badge> : undefined}
      className="h-full"
      bodyClassName="p-0"
    >
      {checks.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-6 text-center text-xs text-muted-foreground">
          <Hourglass size={18} aria-hidden="true" />
          Waiting for enough live candles to evaluate conditions…
        </div>
      ) : (
        <>
          <ul className="divide-y divide-border">
            {checks.map((c) => (
              <li
                key={c.id}
                className={`flex items-center gap-2.5 px-3 py-1.5 transition-colors duration-150 hover:bg-muted/50 ${c.pass ? '' : 'bg-warning/5'}`}
              >
                {c.pass ? (
                  <CheckCircle2 size={15} className="shrink-0 text-success" role="img" aria-label="Passed" />
                ) : (
                  <XCircle size={15} className="shrink-0 text-warning" role="img" aria-label="Not met" />
                )}
                <div className="min-w-0 flex-1">
                  <p className={`text-[13px] font-medium leading-tight ${c.pass ? 'text-foreground' : 'text-warning'}`}>{c.label}</p>
                  <p className="num truncate text-[11px] text-muted-foreground">{c.detail}</p>
                </div>
                <span className={`num shrink-0 text-xs font-semibold ${c.pass ? 'text-success' : 'text-muted-foreground'}`}>
                  {c.pass ? `+${c.weight}` : `0/${c.weight}`}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-border bg-muted/40 px-3 py-2">
            <div>
              <p className="label-xs">Alignment score</p>
              <p className="num text-base font-bold leading-tight text-foreground">
                {score}
                <span className="text-xs font-medium text-muted-foreground"> / {total}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="label-xs">Missing</p>
              <p className="text-xs font-medium text-warning">
                {failed.length === 0 ? 'Nothing — fully aligned' : `${failed.length} check${failed.length > 1 ? 's' : ''} (−${failed.reduce((a, c) => a + c.weight, 0)})`}
              </p>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}