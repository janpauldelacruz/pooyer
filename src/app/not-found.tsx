import React from 'react';
import Link from 'next/link';
import { Home, ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Page Not Found',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-foreground">
      <div className="max-w-md text-center">
        <p className="num text-7xl font-black text-gradient" aria-hidden="true">404</p>
        <h1 className="mt-3 text-2xl font-bold">Signal lost</h1>
        <p className="mb-6 mt-2 text-muted-foreground">
          This page is off the chart. Head back to the live BTCUSD signal feed.
        </p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-all duration-150 hover:brightness-110 active:scale-95"
          >
            <Home size={16} aria-hidden="true" />
            Back to live signals
          </Link>
          <Link
            href="/backtest-strategy-performance"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-secondary px-5 py-2.5 text-sm font-semibold text-secondary-foreground transition-all duration-150 hover:bg-muted active:scale-95"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            View backtest performance
          </Link>
        </div>
      </div>
    </div>
  );
}