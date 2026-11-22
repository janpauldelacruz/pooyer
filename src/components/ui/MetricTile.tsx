import React from 'react';

interface MetricTileProps {
  label: string;
  value: string;
  sub?: string;
  tone?: 'default' | 'good' | 'bad' | 'warn';
  icon?: React.ReactNode;
  className?: string;
  flash?: 'up' | 'down' | null;
}

const TONE_BG: Record<NonNullable<MetricTileProps['tone']>, string> = {
  default: 'bg-card border-border',
  good: 'bg-success/10 border-success/30',
  bad: 'bg-destructive/10 border-destructive/35',
  warn: 'bg-warning/10 border-warning/35',
};

const TONE_VAL: Record<NonNullable<MetricTileProps['tone']>, string> = {
  default: 'text-foreground',
  good: 'text-success',
  bad: 'text-destructive',
  warn: 'text-warning',
};

export default function MetricTile({ label, value, sub, tone = 'default', icon, className = '', flash = null }: MetricTileProps) {
  const flashCls = flash === 'up' ? 'flash-up' : flash === 'down' ? 'flash-down' : '';
  return (
    <div className={`rounded-lg border px-3 py-2 transition-all duration-150 hover:border-primary/40 ${TONE_BG[tone]} ${flashCls} ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="label-xs truncate">{label}</p>
        {icon && <span className="text-muted-foreground" aria-hidden="true">{icon}</span>}
      </div>
      <p className={`num mt-1 text-xl font-bold leading-none ${TONE_VAL[tone]}`}>{value}</p>
      {sub && <p className="mt-1 truncate text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}