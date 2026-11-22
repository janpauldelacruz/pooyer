import React from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}

export default function Card({ title, subtitle, action, children, className = '', bodyClassName = '' }: CardProps) {
  return (
    <section className={`rounded-xl border border-border bg-gradient-to-b from-card to-muted/70 text-card-foreground shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_12px_32px_-18px_rgba(0,0,0,0.8)] transition-colors duration-300 hover:border-primary/25 ${className}`}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 border-b border-border/80 px-3.5 py-2.5">
          <div className="min-w-0">
            {title && <h2 className="text-[13px] font-semibold tracking-tight text-foreground">{title}</h2>}
            {subtitle && <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className={bodyClassName || 'p-3'}>{children}</div>
    </section>
  );
}