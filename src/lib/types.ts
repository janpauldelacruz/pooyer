export type Side = 'LONG' | 'SHORT';
export type ModuleKey = 'confluence' | 'pullback' | 'breakout' | 'meanrev';
export type Outcome = 'TP2 Hit' | 'TP1 Hit' | 'SL Hit' | 'Expired' | 'Active' | 'Forming';

export interface RawKline {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Candle {
  id: string;
  openTime: number;
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ema9: number;
  ema21: number;
  ema50: number;
  vwap: number;
  bbUpper: number;
  bbLower: number;
  bbMid: number;
  rsi: number;
  macdHist: number;
  atr: number;
  mark?: number | null;
  markSide?: Side | null;
}

export interface SignalRow {
  id: string;
  openTime: number;
  time: string;
  side: Side;
  module: ModuleKey;
  entry: number;
  sl: number;
  tp1: number;
  tp2: number;
  tp: number;
  rr: number;
  confidence: number;
  confluence: number;
  confluenceTotal: number;
  atr: number;
  outcome: Outcome;
  rResult: number | null;
}

export interface ConfluenceCheck {
  id: string;
  label: string;
  detail: string;
  pass: boolean;
  weight: number;
}

export interface ModuleTile {
  key: ModuleKey;
  state: 'Armed' | 'Watching' | 'Cooling' | 'Disabled';
  lastSignal: string;
  winRate: number | null;
  signalsToday: number;
  note: string;
}

export interface EquityPoint {
  id: string;
  label: string;
  equity: number;
  drawdown: number;
}

export interface BacktestTrade {
  id: string;
  date: string;
  time: string;
  side: Side;
  module: ModuleKey;
  entry: number;
  exit: number;
  confidence: number;
  holdMin: number;
  rResult: number;
  session: 'Asia' | 'London' | 'New York';
}

export interface BacktestParams {
  minConfidence: number;
  slAtr: number;
  tp1R: number;
  tp2R: number;
  spread: number;
  slippage: number;
  riskPct: number;
  maxTradesPerDay: number;
  htfFilter: boolean;
  newsBlackout: boolean;
}

export const MODULE_LABELS: Record<ModuleKey, string> = {
  confluence: 'Multi-Indicator Confluence',
  pullback: 'Trend Pullback',
  breakout: 'Momentum Breakout',
  meanrev: 'Mean Reversion',
};

export const MODULE_SHORT: Record<ModuleKey, string> = {
  confluence: 'Confluence',
  pullback: 'Pullback',
  breakout: 'Breakout',
  meanrev: 'Mean Rev',
};
