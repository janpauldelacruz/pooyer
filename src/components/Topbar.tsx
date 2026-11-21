'use client';

import React, { useEffect, useState } from 'react';
import { Menu, Search, Bell, Volume2, VolumeX, Command } from 'lucide-react';
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
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur md:px-6">
      <button
        type="button"
        onClick={onOpenMobile}
        aria-label="Open navigation"
        className="rounded-md p-2 text-muted-foreground transition-all duration-150 hover:bg-secondary hover:text-foreground active:scale-95 lg:hidden"
      >
        <Menu size={20} />
      </button>

      <div className="min-w-0">
        <h1 className="truncate text-base font-semibold tracking-tight text-foreground md:text-lg">{title}</h1>
        <p className="hidden text-[11px] text-muted-foreground sm:block">
          BTCUSD · 1m · Binance spot · <span className="num">{price !== null ? fmtPrice(price) : '—'}</span>
        </p>
      </div>

      <div className="ml-auto flex items-center gap-2 md:gap-3">
        <div className="relative hidden w-64 md:block">
          <label htmlFor="global-search" className="sr-only">Search signals</label>
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            id="global-search"
            type="text"
            placeholder="Search signals, modules, IDs"
            className="w-full rounded-lg border border-border bg-input py-2 pl-9 pr-12 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-150 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <span className="num absolute right-2.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            <Command size={10} />K
          </span>
        </div>

        <div className="hidden items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 sm:flex">
          <span className="live-dot h-2 w-2 rounded-full bg-success" />
          <span className="num text-xs font-medium text-foreground">{clock || '--:--:-- UTC'}</span>
        </div>

        <span
          className={`hidden rounded-lg border px-2.5 py-2 sm:inline-flex ${
            soundOn ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground'
          }`}
          aria-label={soundOn ? 'Sound alerts on' : 'Sound alerts muted'}
        >
          {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </span>

        <button
          type="button"
          aria-label="Notifications"
          className="relative rounded-lg border border-border bg-card p-2 text-muted-foreground transition-all duration-150 hover:text-foreground active:scale-95"
        >
          <Bell size={16} />
        </button>
      </div>
    </header>
  );
}