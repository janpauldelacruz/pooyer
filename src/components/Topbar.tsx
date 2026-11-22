'use client';

import React, { useEffect, useState } from 'react';
import { Menu, Search, Volume2, VolumeX } from 'lucide-react';
import { fmtPrice } from '@/lib/format';

interface TopbarProps {
  onOpenMobile: () => void;
  title: string;
  soundOn?: boolean;
  price?: number | null;
}

export default function Topbar({ onOpenMobile, title, soundOn = true, price = null }: TopbarProps) {
  const [clock, setClock] = useState('');

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const p = (n: number) => (n < 10 ? `0${n}` : `${n}`);
      setClock(`${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} UTC`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-12 items-center gap-2.5 border-b border-border bg-background/70 px-3 backdrop-blur-xl md:px-4">
      <button
        type="button"
        onClick={onOpenMobile}
        aria-label="Open navigation"
        className="rounded-md p-1.5 text-muted-foreground transition-all duration-150 hover:bg-secondary hover:text-foreground active:scale-95 lg:hidden"
      >
        <Menu size={18} aria-hidden="true" />
      </button>

      <div className="flex min-w-0 items-baseline gap-2.5">
        <h1 className="truncate text-sm font-bold tracking-tight text-foreground md:text-base">{title}</h1>
        <p className="hidden text-[11px] text-muted-foreground sm:block">
          BTCUSD · 1m · <span className="num font-semibold text-primary">{price !== null ? fmtPrice(price) : '—'}</span>
        </p>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="relative hidden w-52 md:block">
          <label htmlFor="global-search" className="sr-only">Search signals</label>
          <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            id="global-search"
            type="search"
            placeholder="Search signals"
            className="w-full rounded-md border border-border bg-input py-1.5 pl-8 pr-2 text-xs text-foreground placeholder:text-muted-foreground transition-all duration-150 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <div className="hidden items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 sm:flex">
          <span className="live-dot h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
          <span className="num text-[11px] font-medium text-foreground" role="timer" aria-label="Current UTC time">{clock || '--:--:-- UTC'}</span>
        </div>

        <span
          role="img"
          className={`hidden rounded-md border p-1.5 sm:inline-flex ${
            soundOn ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground'
          }`}
          aria-label={soundOn ? 'Sound alerts on' : 'Sound alerts muted'}
        >
          {soundOn ? <Volume2 size={14} aria-hidden="true" /> : <VolumeX size={14} aria-hidden="true" />}
        </span>
      </div>
    </header>
  );
}