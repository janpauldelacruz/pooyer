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
    <section className={`rounded-xl border border-border bg-gradient-to-b from-card to-muted/60 text-card-foreground ${className}`}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 border-b border-border px-3 py-2">
          <div className="min-w-0">
            {title && <h2 className="text-[13px] font-semibold text-foreground">{title}</h2>}
            {subtitle && <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className={bodyClassName || 'p-3'}>{children}</div>
    </section>
  );
}