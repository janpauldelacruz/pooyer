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
  good: 'bg-success/10 border-success/25',
  bad: 'bg-destructive/10 border-destructive/30',
  warn: 'bg-warning/10 border-warning/30',
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
    <div className={`rounded-xl border p-3.5 transition-all duration-150 ${TONE_BG[tone]} ${flashCls} ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="label-xs truncate">{label}</p>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <p className={`num mt-1.5 text-2xl font-bold leading-none ${TONE_VAL[tone]}`}>{value}</p>
      {sub && <p className="mt-1.5 truncate text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}