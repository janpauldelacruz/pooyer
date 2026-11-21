import React from 'react';
import type { Metadata, Viewport } from 'next';
import '../styles/tailwind.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'ScalpSignal — Confluence Signals for BTCUSD 1m Scalping',
  description:
    'ScalpSignal fuses EMA, RSI, MACD, VWAP and Bollinger confluence into scored BTCUSD 1-minute signals with exact entry, stop and target levels.',
  icons: {
    icon: [{ url: '/favicon.ico', type: 'image/x-icon' }],
  },
};

const fontVars = {
  '--font-ibm-plex-sans': "'IBM Plex Sans', system-ui, sans-serif",
  '--font-ibm-plex-mono': "'IBM Plex Mono', ui-monospace, monospace",
} as React.CSSProperties;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={fontVars}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap"
        />

        <script type="module" async src="https://static.rocket.new/rocket-web.js?_cfg=https%3A%2F%2Fscalpsigna7280back.builtwithrocket.new&_be=https%3A%2F%2Fappanalytics.rocket.new&_v=0.1.21" />
        <script type="module" defer src="https://static.rocket.new/rocket-shot.js?v=0.0.3" /></head>
      <body style={{ fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>{children}
</body>
    </html>
  );
}