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
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        status={status}
      />
      <div className={`transition-all duration-300 ease-in-out ${collapsed ? 'lg:pl-16' : 'lg:pl-60'}`}>
        <Topbar title={title} onOpenMobile={() => setMobileOpen(true)} soundOn={soundOn} price={price} />
        <main className="mx-auto w-full max-w-screen-2xl px-4 py-5 md:px-6 lg:px-8 xl:px-10 2xl:px-16">{children}</main>
      </div>
      <Toaster />
    </div>
  );
}