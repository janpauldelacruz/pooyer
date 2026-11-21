import React from 'react';

type Tone = 'long' | 'short' | 'warn' | 'info' | 'neutral' | 'success' | 'danger';

const TONES: Record<Tone, string> = {
  long: 'bg-success/15 text-success border-success/30',
  short: 'bg-destructive/15 text-destructive border-destructive/30',
  warn: 'bg-warning/15 text-warning border-warning/30',
  info: 'bg-primary/15 text-primary border-primary/30',
  neutral: 'bg-secondary text-muted-foreground border-border',
  success: 'bg-success/15 text-success border-success/30',
  danger: 'bg-destructive/15 text-destructive border-destructive/30',
};

interface BadgeProps {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

export default function Badge({ tone = 'neutral', children, className = '', dot = false }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold tracking-wide ${TONES[tone]} ${className}`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}