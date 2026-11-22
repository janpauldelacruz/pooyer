'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, BarChart3, ChevronsLeft, ChevronsRight, X } from 'lucide-react';
import AppLogo from '@/components/ui/AppLogo';
import Tooltip from '@/components/ui/Tooltip';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  status?: 'connecting' | 'live' | 'reconnecting' | 'stale' | 'error';
}

const PRIMARY_NAV = [
  { id: 'nav-live', href: '/', label: 'Live Signals', icon: Activity },
  { id: 'nav-backtest', href: '/backtest-strategy-performance', label: 'Backtest & Performance', icon: BarChart3 },
];

const STATUS_LABEL = {
  connecting: 'Connecting',
  live: 'Streaming',
  reconnecting: 'Reconnecting',
  stale: 'Feed stale',
  error: 'Offline',
} as const;

export default function Sidebar({ collapsed, onToggle, mobileOpen, onCloseMobile, status = 'connecting' }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/' || pathname === '/live-signal-dashboard';
    return pathname === href;
  };

  const content = (isMobile: boolean) => {
    const showLabels = isMobile || !collapsed;
    return (
      <div className="flex h-full flex-col">
        <div className={`flex h-12 items-center border-b border-border px-3 ${showLabels ? 'justify-between' : 'justify-center'}`}>
          <div className="flex items-center gap-2">
            <AppLogo size={26} />
            {showLabels && (
              <span className="text-[15px] font-extrabold tracking-tight text-foreground">
                Scalp<span className="text-gradient">Signal</span>
              </span>
            )}
          </div>
          {isMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Close navigation"
              className="rounded-md p-1.5 text-muted-foreground transition-all duration-150 hover:bg-secondary hover:text-foreground active:scale-95"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {showLabels && (
          <div className="border-gradient mx-2.5 mt-2.5 rounded-lg bg-muted px-2.5 py-2">
            <p className="label-xs">Instrument</p>
            <div className="mt-0.5 flex items-center justify-between">
              <span className="num text-[13px] font-semibold text-foreground">BTCUSD · 1m</span>
              <span
                className={`flex items-center gap-1.5 text-[11px] font-medium ${
                  status === 'live' ? 'text-success' : status === 'error' ? 'text-destructive' : 'text-warning'
                }`}
              >
                <span
                  className={`live-dot h-1.5 w-1.5 rounded-full ${
                    status === 'live' ? 'bg-success' : status === 'error' ? 'bg-destructive' : 'bg-warning'
                  }`}
                  aria-hidden="true"
                />
                {STATUS_LABEL[status]}
              </span>
            </div>
          </div>
        )}

        <nav aria-label="Primary" className="mt-3 flex-1 overflow-y-auto px-2.5">
          {showLabels && <p className="label-xs mb-1.5 px-2">Terminal</p>}
          <ul className="space-y-0.5">
            {PRIMARY_NAV.map((item) => {
              const NavIcon = item.icon;
              const active = isActive(item.href);
              const link = (
                <Link
                  href={item.href}
                  onClick={onCloseMobile}
                  aria-current={active ? 'page' : undefined}
                  aria-label={showLabels ? undefined : item.label}
                  className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-all duration-150 ${
                    active
                      ? 'bg-primary/15 text-primary shadow-[inset_2px_0_0_var(--primary)]'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  } ${showLabels ? '' : 'justify-center'}`}
                >
                  <NavIcon size={16} className="shrink-0" aria-hidden="true" />
                  {showLabels && <span className="flex-1 truncate">{item.label}</span>}
                </Link>
              );
              return <li key={item.id}>{showLabels ? link : <Tooltip text={item.label}>{link}</Tooltip>}</li>;
            })}
          </ul>
        </nav>

        <div className="border-t border-border p-2.5">
          {showLabels ? (
            <div className="rounded-lg bg-muted p-2">
              <p className="text-xs font-semibold text-foreground">Data source</p>
              <p className="truncate text-[11px] text-muted-foreground">Binance BTCUSDT · live 1m stream</p>
            </div>
          ) : null}
          {!isMobile && (
            <button
              type="button"
              onClick={onToggle}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="mt-1.5 hidden w-full items-center justify-center gap-2 rounded-lg py-1.5 text-xs font-medium text-muted-foreground transition-all duration-150 hover:bg-secondary hover:text-foreground active:scale-95 lg:flex"
            >
              {collapsed ? <ChevronsRight size={15} /> : (<><ChevronsLeft size={15} /> Collapse</>)}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden border-r border-border bg-card/90 backdrop-blur transition-all duration-300 ease-in-out lg:block ${
          collapsed ? 'w-14' : 'w-52'
        }`}
      >
        {content(false)}
      </aside>

      <div className={`fixed inset-0 z-50 lg:hidden ${mobileOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        <div
          className={`absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity duration-300 ${
            mobileOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={onCloseMobile}
          aria-hidden="true"
        />
        <aside
          aria-hidden={!mobileOpen}
          className={`absolute inset-y-0 left-0 w-60 border-r border-border bg-card transition-transform duration-300 ease-in-out ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {content(true)}
        </aside>
      </div>
    </>
  );
}