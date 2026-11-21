import { Candle, ConfluenceCheck, ModuleKey, ModuleTile, RawKline, Side, SignalRow } from './types';
import { buildCandles, fmtDate, htfBias } from './indicators';
import {
  DEFAULT_ENGINE,
  Evaluation,
  SIGNAL_VALID_SECONDS,
  bestCandidate,
  evaluateAt,
  generateSignals,
  levelsFor,
} from './signalEngine';

export interface ActiveSignal extends SignalRow {
  firedAt: number;
  validForSeconds: number;
  invalidationLevel: number;
}

export interface SessionStats {
  signalsToday: number;
  wins: number;
  losses: number;
  expired: number;
  active: number;
  netR: number;
  winRate: number | null;
  consecutiveLosses: number;
  maxConsecutiveLossAllowed: number;
  dailyLossLimitR: number;
}

export interface LiveAnalysis {
  candles: Candle[];
  chartCandles: Candle[];
  signals: SignalRow[];
  active: ActiveSignal | null;
  evaluation: Evaluation | null;
  checks: ConfluenceCheck[];
  modules: ModuleTile[];
  session: SessionStats;
  atr: number | null;
  sampleWinRate: number | null;
  sampleSize: number;
}

const MODULE_KEYS: ModuleKey[] = ['confluence', 'pullback', 'breakout', 'meanrev'];

function ago(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 90) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 90) return `${m}m ago`;
  return `${Math.round(m / 60)}h ago`;
}

export function analyze(klines: RawKline[], now: number): LiveAnalysis | null {
  if (klines.length < 80) return null;

  // Signals must never repaint: only candles whose 1m window has fully elapsed are used by the engine.
  const closedKlines = klines.filter((k) => k.openTime + 60_000 <= now);
  if (closedKlines.length < 80) return null;

  const allCandles = buildCandles(klines);
  const candles = buildCandles(closedKlines);
  const htf5 = htfBias(closedKlines, 5);
  const htf15 = htfBias(closedKlines, 15);
  const htfAt = (i: number) => {
    const a = htf5(i);
    const b = htf15(i);
    return a !== 0 && a === b ? a : 0;
  };

  const signals = generateSignals(candles, htfAt, DEFAULT_ENGINE);
  const lastIdx = candles.length - 1;
  const evaluation = evaluateAt(candles, lastIdx, htfAt(lastIdx));

  // Chart shows the live (forming) candle as the last point; markers only on closed-candle signals
  const chartCandles = allCandles.slice(-60).map((c) => ({ ...c }));
  const bySignal = new Map(signals.map((s) => [s.openTime, s]));
  chartCandles.forEach((c) => {
    const s = bySignal.get(c.openTime);
    if (s) {
      c.mark = s.side === 'LONG' ? c.low - c.atr * 0.6 : c.high + c.atr * 0.6;
      c.markSide = s.side;
    }
  });

  // Active signal: most recent signal still within validity window and unresolved
  const latest = signals[signals.length - 1];
  let active: ActiveSignal | null = null;
  if (latest) {
    const firedAt = latest.openTime + 60_000;
    const ageSec = (now - firedAt) / 1000;
    if (ageSec <= SIGNAL_VALID_SECONDS && ageSec >= -60 && (latest.outcome === 'Active' || latest.outcome === 'TP1 Hit')) {
      active = {
        ...latest,
        firedAt,
        validForSeconds: SIGNAL_VALID_SECONDS,
        invalidationLevel: latest.sl,
      };
    }
  }

  // Session (UTC day) stats from real signals
  const today = fmtDate(now);
  const todays = signals.filter((s) => fmtDate(s.openTime) === today);
  const resolved = todays.filter((s) => s.rResult !== null);
  const wins = resolved.filter((s) => (s.rResult ?? 0) > 0).length;
  const losses = resolved.filter((s) => (s.rResult ?? 0) < 0).length;
  const expired = todays.filter((s) => s.outcome === 'Expired').length;
  const netR = resolved.reduce((a, s) => a + (s.rResult ?? 0), 0);
  let consecutive = 0;
  for (let i = resolved.length - 1; i >= 0; i--) {
    if ((resolved[i].rResult ?? 0) < 0) consecutive++;
    else break;
  }
  const session: SessionStats = {
    signalsToday: todays.length,
    wins,
    losses,
    expired,
    active: todays.filter((s) => s.outcome === 'Active').length,
    netR: +netR.toFixed(2),
    winRate: wins + losses > 0 ? +((wins / (wins + losses)) * 100).toFixed(1) : null,
    consecutiveLosses: consecutive,
    maxConsecutiveLossAllowed: 3,
    dailyLossLimitR: -4,
  };

  // Module tiles from real signal history in loaded window
  const modules: ModuleTile[] = MODULE_KEYS.map((key) => {
    const ms = signals.filter((s) => s.module === key);
    const done = ms.filter((s) => s.rResult !== null);
    const w = done.filter((s) => (s.rResult ?? 0) > 0).length;
    const last = ms[ms.length - 1];
    const todayCount = ms.filter((s) => fmtDate(s.openTime) === today).length;
    const cand = evaluation?.candidates.find((c) => c.module === key);
    const sinceLast = last ? now - (last.openTime + 60_000) : Infinity;
    const lastTwoSl = ms.slice(-1)[0]?.outcome === 'SL Hit' && sinceLast < 4 * 60_000;
    let state: ModuleTile['state'] = 'Watching';
    let note = 'No setup on the latest candle';
    if (cand && cand.confidence >= DEFAULT_ENGINE.minConfidence) {
      state = 'Armed';
      note = `${cand.side} setup · confidence ${cand.confidence}`;
    } else if (lastTwoSl) {
      state = 'Cooling';
      note = 'Cooling down after a stop-out';
    } else if (key === 'confluence' && evaluation) {
      note = `${evaluation.biasChecks}/${evaluation.checks.length} checks aligned${evaluation.bias ? ` — ${evaluation.bias} bias` : ''}`;
    } else if (key === 'pullback') note = 'Waiting for EMA21 retest in an established trend';
    else if (key === 'breakout') note = 'Waiting for a 20-bar range break on volume';
    else if (key === 'meanrev') note = 'Needs %B < 0.05 or > 0.95 with RSI extreme';
    return {
      key,
      state,
      lastSignal: last ? ago(sinceLast) : 'none yet',
      winRate: done.length ? +((w / done.length) * 100).toFixed(1) : null,
      signalsToday: todayCount,
      note,
    };
  });

  const doneAll = signals.filter((s) => s.rResult !== null);
  const winsAll = doneAll.filter((s) => (s.rResult ?? 0) > 0).length;

  return {
    candles,
    chartCandles,
    signals,
    active,
    evaluation,
    checks: evaluation?.checks ?? [],
    modules,
    session,
    atr: candles[lastIdx].atr,
    sampleWinRate: doneAll.length ? +((winsAll / doneAll.length) * 100).toFixed(1) : null,
    sampleSize: doneAll.length,
  };
}

export function previewLevels(side: Side, entry: number, atr: number) {
  return levelsFor(side, entry, atr, DEFAULT_ENGINE);
}

export { bestCandidate };
