import React from 'react';
import type { Metadata, Viewport } from 'next';
import '../styles/tailwind.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#07050f',
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://scalpsigna7280.builtwithrocket.new';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'ScalpSignal — Live BTCUSD 1-Minute Scalping Signals',
    template: '%s | ScalpSignal',
  },
  description:
    'Live BTCUSD 1-minute BUY/SELL scalping signals scored by EMA, RSI, MACD, VWAP and Bollinger confluence — with exact entry, stop-loss and take-profit levels from real market data.',
  keywords: ['BTCUSD scalping signals', '1 minute bitcoin signals', 'crypto scalping', 'BTC buy sell signals', 'confluence trading'],
  applicationName: 'ScalpSignal',
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: 'website',
    siteName: 'ScalpSignal',
    title: 'ScalpSignal — Live BTCUSD 1-Minute Scalping Signals',
    description:
      'Real-time BUY/SELL signals for BTCUSD 1m scalping with scored confluence, exact entry, stop and targets.',
    url: SITE_URL,
  },
  twitter: {
    card: 'summary',
    title: 'ScalpSignal — Live BTCUSD 1-Minute Scalping Signals',
    description: 'Real-time BUY/SELL signals for BTCUSD 1m scalping with exact entry, stop and targets.',
  },
  robots: { index: true, follow: true },
  icons: {
    icon: [{ url: '/favicon.ico', type: 'image/x-icon' }],
  },
};

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'ScalpSignal',
    url: SITE_URL,
    logo: `${SITE_URL}/assets/images/app_logo.png`,
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'ScalpSignal — Live BTCUSD 1-Minute Scalping Signals',
    url: SITE_URL,
    description:
      'Live BTCUSD 1-minute scalping signals with confluence scoring, entry, stop-loss and take-profit levels.',
    isPartOf: { '@type': 'WebSite', name: 'ScalpSignal', url: SITE_URL },
  },
];

const fontVars = {
  '--font-ibm-plex-sans': "'Plus Jakarta Sans', system-ui, sans-serif",
  '--font-ibm-plex-mono': "'JetBrains Mono', ui-monospace, monospace",
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
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <script type="module" async src="https://static.rocket.new/rocket-web.js?_cfg=https%3A%2F%2Fscalpsigna7280back.builtwithrocket.new&_be=https%3A%2F%2Fappanalytics.rocket.new&_v=0.1.21" />
        <script type="module" defer src="https://static.rocket.new/rocket-shot.js?v=0.0.3" /></head>
      <body style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>{children}</body>
    </html>
  );
}