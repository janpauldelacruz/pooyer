import React from 'react';

interface ConfidenceRingProps {
  value: number;
  size?: number;
  stroke?: number;
  tone: 'long' | 'short';
}

export default function ConfidenceRing({ value, size = 92, stroke = 8, tone }: ConfidenceRingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  const color = tone === 'long' ? 'var(--success)' : 'var(--destructive)';
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`Confidence ${value} out of 100`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-all duration-500"
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="num text-2xl font-bold leading-none text-foreground">{value}</span>
        <span className="label-xs mt-0.5 text-[10px]">Confidence</span>
      </div>
    </div>
  );
}