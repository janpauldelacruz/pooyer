'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, BarChart3, ChevronsLeft, ChevronsRight, Bell, Settings, LifeBuoy, X } from 'lucide-react';
import AppLogo from '@/components/ui/AppLogo';
import Tooltip from '@/components/ui/Tooltip';
import Icon from '@/components/ui/AppIcon';


interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  status?: 'connecting' | 'live' | 'reconnecting' | 'stale' | 'error';
}

const PRIMARY_NAV = [
  { id: 'nav-live', href: '/', label: 'Live Signals', icon: Activity, badge: null },
  { id: 'nav-backtest', href: '/backtest-strategy-performance', label: 'Backtest & Performance', icon: BarChart3, badge: null },
];

const SECONDARY_NAV = [
  { id: 'nav-alerts', label: 'Alert Rules', icon: Bell, badge: null },
  { id: 'nav-settings', label: 'Preferences', icon: Settings, badge: null },
  { id: 'nav-help', label: 'Strategy Docs', icon: LifeBuoy, badge: null },
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
        <div className={`flex h-16 items-center border-b border-border px-4 ${showLabels ? 'justify-between' : 'justify-center'}`}>
          <div className="flex items-center gap-2.5">
            <AppLogo size={32} />
            {showLabels && (
              <span className="text-[15px] font-bold tracking-tight text-foreground">
                Scalp<span className="text-primary">Signal</span>
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
              <X size={18} />
            </button>
          )}
        </div>

        {showLabels && (
          <div className="mx-3 mt-3 rounded-lg border border-border bg-muted px-3 py-2.5">
            <p className="label-xs">Instrument</p>
            <div className="mt-1 flex items-center justify-between">
              <span className="num text-sm font-semibold text-foreground">BTCUSD · 1m</span>
              <span
                className={`flex items-center gap-1.5 text-[11px] font-medium ${
                  status === 'live' ? 'text-success' : status === 'error' ? 'text-destructive' : 'text-warning'
                }`}
              >
                <span
                  className={`live-dot h-1.5 w-1.5 rounded-full ${
                    status === 'live' ? 'bg-success' : status === 'error' ? 'bg-destructive' : 'bg-warning'
                  }`}
                />
                {STATUS_LABEL[status]}
              </span>
            </div>
          </div>
        )}

        <nav className="mt-4 flex-1 space-y-6 overflow-y-auto px-3">
          <div>
            {showLabels && <p className="label-xs mb-2 px-2">Terminal</p>}
            <ul className="space-y-1">
              {PRIMARY_NAV.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                const link = (
                  <Link
                    href={item.href}
                    onClick={onCloseMobile}
                    className={`group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-150 ${
                      active
                        ? 'bg-primary/10 text-primary' :'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    } ${showLabels ? '' : 'justify-center'}`}
                  >
                    <Icon size={18} className="shrink-0" />
                    {showLabels && <span className="flex-1 truncate">{item.label}</span>}
                    {showLabels && item.badge && (
                      <span className="num rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
                return (
                  <li key={item.id}>
                    {showLabels ? link : <Tooltip text={item.label}>{link}</Tooltip>}
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            {showLabels && <p className="label-xs mb-2 px-2">Workspace</p>}
            <ul className="space-y-1">
              {SECONDARY_NAV.map((item) => {
                const Icon = item.icon;
                const btn = (
                  <button
                    type="button"
                    className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-muted-foreground transition-all duration-150 hover:bg-secondary hover:text-foreground ${
                      showLabels ? '' : 'justify-center'
                    }`}
                  >
                    <Icon size={18} className="shrink-0" />
                    {showLabels && <span className="flex-1 truncate text-left">{item.label}</span>}
                    {showLabels && item.badge && (
                      <span className="num rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-bold text-secondary-foreground">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
                return (
                  <li key={item.id}>
                    {showLabels ? btn : <Tooltip text={item.label}>{btn}</Tooltip>}
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

        <div className="border-t border-border p-3">
          {showLabels ? (
            <div className="rounded-lg bg-muted p-2.5">
              <p className="text-sm font-semibold text-foreground">Data source</p>
              <p className="truncate text-[11px] text-muted-foreground">Binance BTCUSDT · live 1m stream</p>
            </div>
          ) : null}
          {!isMobile && (
            <button
              type="button"
              onClick={onToggle}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="mt-2 hidden w-full items-center justify-center gap-2 rounded-lg py-2 text-xs font-medium text-muted-foreground transition-all duration-150 hover:bg-secondary hover:text-foreground active:scale-95 lg:flex"
            >
              {collapsed ? <ChevronsRight size={16} /> : (<><ChevronsLeft size={16} /> Collapse</>)}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden border-r border-border bg-card transition-all duration-300 ease-in-out lg:block ${
          collapsed ? 'w-16' : 'w-60'
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
        />
        <aside
          className={`absolute inset-y-0 left-0 w-64 border-r border-border bg-card transition-transform duration-300 ease-in-out ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {content(true)}
        </aside>
      </div>
    </>
  );
}