import React from 'react';
import type { Metadata } from 'next';
import SettingsPanel from './SettingsPanel';

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Configure alert volume, risk warnings, candlestick theme and live data source for the ScalpSignal terminal.',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <SettingsPanel />;
}
