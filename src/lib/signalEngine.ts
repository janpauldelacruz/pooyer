import { Candle, ConfluenceCheck, ModuleKey, Outcome, Side, SignalRow } from './types';
import { fmtClock } from './indicators';

export const SIGNAL_VALID_SECONDS = 120;
export const MAX_RESOLVE_BARS = 30;

export interface EngineConfig {
  minConfidence: number;
  slAtr: number;
  tp1R: number;
  tp2R: number;
  cooldownBars: number;
}

export const DEFAULT_ENGINE: EngineConfig = {
  minConfidence: 70,
  slAtr: 1.0,
  tp1R: 1.0,
  tp2R: 2.0,
  cooldownBars: 3,
};

export interface Candidate {
  side: Side;
  module: ModuleKey;
  confidence: number;
  confluence: number;
  confluenceTotal: number;
}

export interface Evaluation {
  checks: ConfluenceCheck[];
  longScore: number;
  shortScore: number;
  total: number;
  candidates: Candidate[];
  bias: Side | null;
  biasChecks: number;
}

function avgVolume(candles: Candle[], i: number, n = 20) {
  const from = Math.max(0, i - n);
  const slice = candles.slice(from, i);
  if (slice.length === 0) return candles[i].volume;
  return slice.reduce((a, c) => a + c.volume, 0) / slice.length;
}

function fmt(n: number, d = 1) {
  return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}

/** Evaluate every module at candle index i. Uses data up to and including i only. */
export function evaluateAt(candles: Candle[], i: number, htf: number): Evaluation | null {
  if (i < 55 || i >= candles.length) return null;
  const c = candles[i];
  const p = candles[i - 1];
  const volAvg = avgVolume(candles, i);
  const volRatio = volAvg > 0 ? c.volume / volAvg : 1;
  const bw = c.bbUpper - c.bbLower;
  const pctB = bw > 0 ? (c.close - c.bbLower) / bw : 0.5;
  const prevBw = p.bbUpper - p.bbLower;

  const buildChecks = (side: Side): ConfluenceCheck[] => {
    const long = side === 'LONG';
    const stack = long ? c.ema9 > c.ema21 && c.ema21 > c.ema50 : c.ema9 < c.ema21 && c.ema21 < c.ema50;
    const rsiOk = long ? c.rsi >= 52 && c.rsi <= 68 : c.rsi >= 32 && c.rsi <= 48;
    const macdOk = long
      ? c.macdHist > 0 && c.macdHist > p.macdHist
      : c.macdHist < 0 && c.macdHist < p.macdHist;
    const vwapOk = long ? c.close > c.vwap : c.close < c.vwap;
    const bbOk = long ? pctB >= 0.55 && pctB <= 0.9 : pctB >= 0.1 && pctB <= 0.45;
    const volOk = volRatio >= 1.4;
    const htfOk = long ? htf > 0 : htf < 0;
    return [
      { id: 'chk-ema', label: long ? 'EMA 9 > 21 > 50 stack' : 'EMA 9 < 21 < 50 stack', detail: `${fmt(c.ema9)} / ${fmt(c.ema21)} / ${fmt(c.ema50)}`, pass: stack, weight: 18 },
      { id: 'chk-rsi', label: long ? 'RSI(14) in 52–68 momentum band' : 'RSI(14) in 32–48 momentum band', detail: `RSI ${c.rsi.toFixed(1)}, ${c.rsi >= p.rsi ? 'rising' : 'falling'}`, pass: rsiOk, weight: 14 },
      { id: 'chk-macd', label: long ? 'MACD histogram positive & expanding' : 'MACD histogram negative & expanding', detail: `${c.macdHist >= 0 ? '+' : ''}${c.macdHist.toFixed(2)} vs ${p.macdHist >= 0 ? '+' : ''}${p.macdHist.toFixed(2)}`, pass: macdOk, weight: 16 },
      { id: 'chk-vwap', label: long ? 'Price above session VWAP' : 'Price below session VWAP', detail: `${c.close - c.vwap >= 0 ? '+' : ''}${(c.close - c.vwap).toFixed(1)} vs ${fmt(c.vwap)}`, pass: vwapOk, weight: 15 },
      { id: 'chk-bb', label: long ? 'Bollinger %B between 0.55–0.90' : 'Bollinger %B between 0.10–0.45', detail: `%B ${pctB.toFixed(2)}, bands ${bw >= prevBw ? 'expanding' : 'contracting'}`, pass: bbOk, weight: 10 },
      { id: 'chk-vol', label: 'Volume ≥ 1.4× 20-bar average', detail: `${volRatio.toFixed(2)}× (${c.volume.toFixed(1)} vs ${volAvg.toFixed(1)})`, pass: volOk, weight: 14 },
      { id: 'chk-htf', label: '5m & 15m EMA bias aligned', detail: htf > 0 ? 'Higher timeframe bullish' : htf < 0 ? 'Higher timeframe bearish' : 'Higher timeframe flat', pass: htfOk, weight: 13 },
    ];
  };

  const longChecks = buildChecks('LONG');
  const shortChecks = buildChecks('SHORT');
  const score = (cs: ConfluenceCheck[]) => cs.reduce((a, x) => a + (x.pass ? x.weight : 0), 0);
  const longScore = score(longChecks);
  const shortScore = score(shortChecks);
  const total = longChecks.reduce((a, x) => a + x.weight, 0);
  const bias: Side | null = longScore === shortScore ? null : longScore > shortScore ? 'LONG' : 'SHORT';
  const checks = bias === 'SHORT' ? shortChecks : longChecks;
  const biasChecks = checks.filter((x) => x.pass).length;

  const candidates: Candidate[] = [];

  // Module 1: confluence
  (['LONG', 'SHORT'] as Side[]).forEach((side) => {
    const cs = side === 'LONG' ? longChecks : shortChecks;
    const sc = side === 'LONG' ? longScore : shortScore;
    const n = cs.filter((x) => x.pass).length;
    if (n >= 5 && sc >= 60) {
      candidates.push({
        side,
        module: 'confluence',
        confidence: Math.min(98, Math.round(40 + (sc / total) * 58)),
        confluence: n,
        confluenceTotal: cs.length,
      });
    }
  });

  // Module 2: trend pullback to EMA21 in an established trend
  const upTrend = c.ema9 > c.ema21 && c.ema21 > c.ema50;
  const downTrend = c.ema9 < c.ema21 && c.ema21 < c.ema50;
  if (upTrend && p.low <= p.ema21 + c.atr * 0.15 && c.close > c.ema21 && c.close > c.open && c.rsi > 45) {
    candidates.push({ side: 'LONG', module: 'pullback', confidence: Math.min(95, 62 + Math.round((htf > 0 ? 12 : 0) + (volRatio > 1 ? 8 : 0) + (c.macdHist > p.macdHist ? 6 : 0))), confluence: 4 + (htf > 0 ? 1 : 0), confluenceTotal: 7 });
  }
  if (downTrend && p.high >= p.ema21 - c.atr * 0.15 && c.close < c.ema21 && c.close < c.open && c.rsi < 55) {
    candidates.push({ side: 'SHORT', module: 'pullback', confidence: Math.min(95, 62 + Math.round((htf < 0 ? 12 : 0) + (volRatio > 1 ? 8 : 0) + (c.macdHist < p.macdHist ? 6 : 0))), confluence: 4 + (htf < 0 ? 1 : 0), confluenceTotal: 7 });
  }

  // Module 3: momentum breakout of 20-bar range with volume
  const rangeSlice = candles.slice(i - 20, i);
  const hh = Math.max(...rangeSlice.map((x) => x.high));
  const ll = Math.min(...rangeSlice.map((x) => x.low));
  if (c.close > hh && volRatio >= 1.5 && c.macdHist > 0) {
    candidates.push({ side: 'LONG', module: 'breakout', confidence: Math.min(92, 60 + Math.round(Math.min(volRatio, 3) * 5 + (htf > 0 ? 10 : 0))), confluence: 4, confluenceTotal: 7 });
  }
  if (c.close < ll && volRatio >= 1.5 && c.macdHist < 0) {
    candidates.push({ side: 'SHORT', module: 'breakout', confidence: Math.min(92, 60 + Math.round(Math.min(volRatio, 3) * 5 + (htf < 0 ? 10 : 0))), confluence: 4, confluenceTotal: 7 });
  }

  // Module 4: mean reversion from Bollinger extremes
  if (pctB < 0.05 && c.rsi < 30 && c.close > c.open) {
    candidates.push({ side: 'LONG', module: 'meanrev', confidence: Math.min(90, 58 + Math.round((30 - c.rsi) * 1.5 + (htf >= 0 ? 6 : 0))), confluence: 3, confluenceTotal: 7 });
  }
  if (pctB > 0.95 && c.rsi > 70 && c.close < c.open) {
    candidates.push({ side: 'SHORT', module: 'meanrev', confidence: Math.min(90, 58 + Math.round((c.rsi - 70) * 1.5 + (htf <= 0 ? 6 : 0))), confluence: 3, confluenceTotal: 7 });
  }

  return { checks, longScore, shortScore, total, candidates, bias, biasChecks };
}

export function levelsFor(side: Side, entry: number, atr: number, cfg: EngineConfig) {
  const risk = Math.max(atr * cfg.slAtr, 1);
  const long = side === 'LONG';
  return {
    sl: +(long ? entry - risk : entry + risk).toFixed(2),
    tp1: +(long ? entry + risk * cfg.tp1R : entry - risk * cfg.tp1R).toFixed(2),
    tp2: +(long ? entry + risk * cfg.tp2R : entry - risk * cfg.tp2R).toFixed(2),
    risk,
  };
}

export function bestCandidate(ev: Evaluation, cfg: EngineConfig): Candidate | null {
  const ok = ev.candidates.filter((x) => x.confidence >= cfg.minConfidence);
  if (ok.length === 0) return null;
  return ok.sort((a, b) => b.confidence - a.confidence)[0];
}

export interface Resolution {
  outcome: Outcome;
  rResult: number | null;
  exitPrice: number;
  barsHeld: number;
}

/**
 * Resolve a trade entered at close of candle i by walking subsequent candles.
 * Partial exit: 50% at TP1, remainder at TP2 (stop moves to entry after TP1).
 * If SL and TP touch in the same bar, SL is assumed first (conservative).
 */
export function resolveTrade(
  candles: Candle[],
  i: number,
  side: Side,
  entry: number,
  sl: number,
  tp1: number,
  tp2: number,
  costPrice: number,
  tp1R: number,
  tp2R: number
): Resolution {
  const long = side === 'LONG';
  const risk = Math.abs(entry - sl);
  const costR = risk > 0 ? costPrice / risk : 0;
  let tp1Hit = false;
  const last = Math.min(candles.length - 1, i + MAX_RESOLVE_BARS);
  for (let j = i + 1; j <= last; j++) {
    const b = candles[j];
    const hitSl = long ? b.low <= (tp1Hit ? entry : sl) : b.high >= (tp1Hit ? entry : sl);
    const hitTp1 = long ? b.high >= tp1 : b.low <= tp1;
    const hitTp2 = long ? b.high >= tp2 : b.low <= tp2;
    if (!tp1Hit) {
      if (hitSl) return { outcome: 'SL Hit', rResult: +(-1 - costR).toFixed(2), exitPrice: sl, barsHeld: j - i };
      if (hitTp2) return { outcome: 'TP2 Hit', rResult: +(0.5 * tp1R + 0.5 * tp2R - costR).toFixed(2), exitPrice: tp2, barsHeld: j - i };
      if (hitTp1) tp1Hit = true;
    } else {
      if (hitSl) return { outcome: 'TP1 Hit', rResult: +(0.5 * tp1R - costR).toFixed(2), exitPrice: entry, barsHeld: j - i };
      if (hitTp2) return { outcome: 'TP2 Hit', rResult: +(0.5 * tp1R + 0.5 * tp2R - costR).toFixed(2), exitPrice: tp2, barsHeld: j - i };
    }
  }
  if (last < i + MAX_RESOLVE_BARS) {
    return { outcome: tp1Hit ? 'TP1 Hit' : 'Active', rResult: null, exitPrice: candles[candles.length - 1].close, barsHeld: last - i };
  }
  const exit = candles[last].close;
  const open = long ? (exit - entry) / risk : (entry - exit) / risk;
  if (tp1Hit) return { outcome: 'TP1 Hit', rResult: +(0.5 * tp1R + 0.5 * open - costR).toFixed(2), exitPrice: exit, barsHeld: last - i };
  return { outcome: 'Expired', rResult: +(open - costR).toFixed(2), exitPrice: exit, barsHeld: last - i };
}

/** Generate the live signal history from real candles (no look-ahead). */
export function generateSignals(
  candles: Candle[],
  htfAt: (i: number) => number,
  cfg: EngineConfig = DEFAULT_ENGINE
): SignalRow[] {
  const rows: SignalRow[] = [];
  let lastFired = -999;
  for (let i = 55; i < candles.length; i++) {
    if (i - lastFired < cfg.cooldownBars) continue;
    const ev = evaluateAt(candles, i, htfAt(i));
    if (!ev) continue;
    const cand = bestCandidate(ev, cfg);
    if (!cand) continue;
    const c = candles[i];
    const lv = levelsFor(cand.side, c.close, c.atr, cfg);
    const res = resolveTrade(candles, i, cand.side, c.close, lv.sl, lv.tp1, lv.tp2, 0, cfg.tp1R, cfg.tp2R);
    const isOpen = res.outcome === 'Active' || (res.rResult === null && i + MAX_RESOLVE_BARS > candles.length - 1);
    rows.push({
      id: `sig-${c.openTime}`,
      openTime: c.openTime,
      time: fmtClock(c.openTime + 59_000, true),
      side: cand.side,
      module: cand.module,
      entry: c.close,
      sl: lv.sl,
      tp1: lv.tp1,
      tp2: lv.tp2,
      tp: lv.tp1,
      rr: +cfg.tp1R.toFixed(2),
      confidence: cand.confidence,
      confluence: cand.confluence,
      confluenceTotal: cand.confluenceTotal,
      atr: c.atr,
      outcome: isOpen && res.outcome !== 'TP1 Hit' ? 'Active' : res.outcome,
      rResult: res.rResult,
    });
    lastFired = i;
  }
  return rows;
}
