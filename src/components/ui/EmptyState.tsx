import React from 'react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-secondary text-muted-foreground">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-1 rounded-md bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground transition-all duration-150 hover:opacity-90 active:scale-95"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}