import React from 'react';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
  side?: 'right' | 'top';
}

export default function Tooltip({ text, children, side = 'right' }: TooltipProps) {
  const pos =
    side === 'right' ?'left-full top-1/2 ml-2 -translate-y-1/2' :'bottom-full left-1/2 mb-2 -translate-x-1/2';
  return (
    <span className="group/tip relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute z-50 whitespace-nowrap rounded-md border border-border bg-card px-2 py-1 text-[11px] font-medium text-foreground opacity-0 shadow-lg transition-opacity duration-150 group-hover/tip:opacity-100 ${pos}`}
      >
        {text}
      </span>
    </span>
  );
}