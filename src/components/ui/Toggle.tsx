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
  return (
    <div className="flex items-center justify-between gap-3">
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full border transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          checked ? 'border-primary/50 bg-primary' : 'border-border bg-secondary'
        }`}
      >
        <span
          className={`absolute top-0.5 h-4.5 w-4.5 rounded-full bg-foreground transition-all duration-200 ${
            checked ? 'left-[22px]' : 'left-0.5'
          }`}
          style={{ height: 18, width: 18 }}
        />
      </button>
    </div>
  );
}