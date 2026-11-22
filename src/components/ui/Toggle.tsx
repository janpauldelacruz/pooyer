'use client';

import React from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  id: string;
}

export default function Toggle({ checked, onChange, label, description, id }: ToggleProps) {
  const descId = description ? `${id}-desc` : undefined;
  return (
    <div className="flex items-center justify-between gap-3">
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <span className="block text-[13px] font-medium text-foreground">{label}</span>
        {description && (
          <span id={descId} className="block text-[11px] text-muted-foreground">{description}</span>
        )}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={descId}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full border transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          checked ? 'border-primary/50 bg-primary' : 'border-border bg-secondary'
        }`}
      >
        <span
          aria-hidden="true"
          className={`absolute top-0.5 rounded-full bg-foreground transition-all duration-200 ${
            checked ? 'left-[18px]' : 'left-0.5'
          }`}
          style={{ height: 14, width: 14 }}
        />
      </button>
    </div>
  );
}