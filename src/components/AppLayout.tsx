'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import Toaster from '@/components/ui/Toaster';

interface AppLayoutProps {
  title: string;
  children: React.ReactNode;
  soundOn?: boolean;
  price?: number | null;
  status?: 'connecting' | 'live' | 'reconnecting' | 'stale' | 'error';
}

export default function AppLayout({ title, children, soundOn = true, price = null, status = 'connecting' }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only z-[60] rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to main content
      </a>
      <div className="aurora" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        status={status}
      />
      <div className={`relative z-10 transition-all duration-300 ease-in-out ${collapsed ? 'lg:pl-14' : 'lg:pl-52'}`}>
        <Topbar title={title} onOpenMobile={() => setMobileOpen(true)} soundOn={soundOn} price={price} />
        <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-screen-2xl px-2 py-2 md:px-3 lg:px-4 xl:px-5">
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  );
}