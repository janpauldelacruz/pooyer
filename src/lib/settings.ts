'use client';

import { useCallback, useEffect, useState } from 'react';

export type CandleThemeId = 'classic' | 'neon' | 'mono' | 'colorblind' | 'amber';
export type DataSourceId = 'binance' | 'binance-vision' | 'binance-us';

export interface TerminalSettings {
  alertVolume: number;
  riskWarnings: boolean;
  riskDisclaimer: boolean;
  driftWarning: boolean;
  lowConfidenceWarning: boolean;
  candleTheme: CandleThemeId;
  dataSource: DataSourceId;
}

export const DEFAULT_SETTINGS: TerminalSettings = {
  alertVolume: 60,
  riskWarnings: true,
  riskDisclaimer: true,
  driftWarning: true,
  lowConfidenceWarning: true,
  candleTheme: 'neon',
  dataSource: 'binance',
};

export interface CandleTheme {
  id: CandleThemeId;
  label: string;
  description: string;
  up: string;
  down: string;
  hollowUp: boolean;
}

export const CANDLE_THEMES: CandleTheme[] = [
  { id: 'neon', label: 'Neon', description: 'Electric mint and hot pink', up: '#22f5a6', down: '#ff3d81', hollowUp: false },
  { id: 'classic', label: 'Classic', description: 'Green up, red down', up: '#16a34a', down: '#dc2626', hollowUp: false },
  { id: 'colorblind', label: 'Colorblind safe', description: 'Blue up, orange down', up: '#3b9eff', down: '#ff9f1c', hollowUp: false },
  { id: 'mono', label: 'Monochrome', description: 'Hollow up, solid down', up: '#e5e7eb', down: '#9ca3af', hollowUp: true },
  { id: 'amber', label: 'Amber terminal', description: 'Gold up, violet down', up: '#fbbf24', down: '#a78bfa', hollowUp: false },
];

export interface DataSource {
  id: DataSourceId;
  label: string;
  description: string;
  rest: string;
  ws: string;
  host: string;
}

export const DATA_SOURCES: DataSource[] = [
  {
    id: 'binance',
    label: 'Binance Global',
    description: 'api.binance.com · default, lowest latency',
    rest: 'https://api.binance.com/api/v3/klines',
    ws: 'wss://stream.binance.com:9443/stream',
    host: 'Binance BTCUSDT',
  },
  {
    id: 'binance-vision',
    label: 'Binance Market Data',
    description: 'data-api.binance.vision · public market-data mirror',
    rest: 'https://data-api.binance.vision/api/v3/klines',
    ws: 'wss://data-stream.binance.vision/stream',
    host: 'Binance Market Data BTCUSDT',
  },
  {
    id: 'binance-us',
    label: 'Binance US',
    description: 'api.binance.us · for US-restricted networks',
    rest: 'https://api.binance.us/api/v3/klines',
    ws: 'wss://stream.binance.us:9443/stream',
    host: 'Binance US BTCUSDT',
  },
];

export function getCandleTheme(id: CandleThemeId): CandleTheme {
  return CANDLE_THEMES.find((t) => t.id === id) ?? CANDLE_THEMES[0];
}

export function getDataSource(id: DataSourceId): DataSource {
  return DATA_SOURCES.find((s) => s.id === id) ?? DATA_SOURCES[0];
}

const KEY = 'scalpsignal.settings.v1';
const EVENT = 'scalpsignal:settings';

function sanitize(raw: unknown): TerminalSettings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<TerminalSettings>;
  const d = DEFAULT_SETTINGS;
  const vol = typeof r.alertVolume === 'number' ? Math.min(100, Math.max(0, Math.round(r.alertVolume))) : d.alertVolume;
  return {
    alertVolume: vol,
    riskWarnings: typeof r.riskWarnings === 'boolean' ? r.riskWarnings : d.riskWarnings,
    riskDisclaimer: typeof r.riskDisclaimer === 'boolean' ? r.riskDisclaimer : d.riskDisclaimer,
    driftWarning: typeof r.driftWarning === 'boolean' ? r.driftWarning : d.driftWarning,
    lowConfidenceWarning: typeof r.lowConfidenceWarning === 'boolean' ? r.lowConfidenceWarning : d.lowConfidenceWarning,
    candleTheme: CANDLE_THEMES.some((t) => t.id === r.candleTheme) ? (r.candleTheme as CandleThemeId) : d.candleTheme,
    dataSource: DATA_SOURCES.some((s) => s.id === r.dataSource) ? (r.dataSource as DataSourceId) : d.dataSource,
  };
}

function read(): TerminalSettings {
  try {
    const s = window.localStorage.getItem(KEY);
    return s ? sanitize(JSON.parse(s)) : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** Persisted terminal settings. Starts with defaults for SSR, then hydrates from localStorage. */
export function useSettings(): {
  settings: TerminalSettings;
  ready: boolean;
  update: (patch: Partial<TerminalSettings>) => void;
  reset: () => void;
} {
  const [settings, setSettings] = useState<TerminalSettings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSettings(read());
    setReady(true);
    const sync = () => setSettings(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const write = useCallback((next: TerminalSettings) => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // storage unavailable; settings stay in memory for this tab
    }
    setSettings(next);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  const update = useCallback(
    (patch: Partial<TerminalSettings>) => write(sanitize({ ...read(), ...patch })),
    [write]
  );
  const reset = useCallback(() => write(DEFAULT_SETTINGS), [write]);

  return { settings, ready, update, reset };
}
