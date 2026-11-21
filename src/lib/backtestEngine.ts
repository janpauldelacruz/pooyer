import { BacktestParams, BacktestTrade, EquityPoint, ModuleKey, RawKline } from './types';
import { buildCandles, fmtClock, fmtDate, htfBias } from './indicators';
import { bestCandidate, evaluateAt, levelsFor, MAX_RESOLVE_BARS, resolveTrade } from './signalEngine';

export const DEFAULT_PARAMS: BacktestParams = {
  minConfidence: 70,
  slAtr: 1.0,
  tp1R: 1.0,
  tp2R: 2.0,
  spread: 2.5,
  slippage: 0.8,
  riskPct: 1,
  maxTradesPerDay: 20,
  htfFilter: true,
  newsBlackout: false,
};

export interface ModuleStat {
  id: string;
  module: string;
  key: ModuleKey;
  winRate: number;
  profitFactor: number;
  trades: number;
}

export interface BacktestResult {
  ranAt: number;
  from: number;
  to: number;
  bars: number;
  params: BacktestParams;
  kpis: {
    winRate: number;
    wins: number;
    losses: number;
    profitFactor: number;
    expectancy: number;
    maxDrawdown: number;
    totalTrades: number;
    tradesPerDay: number;
    avgRR: number;
    sharpe: number;
    avgHoldMin: number;
    recoveryBars: number;
  };
  equity: EquityPoint[];
  moduleStats: ModuleStat[];
  hourly: { id: string; hour: string; winRate: number; trades: number }[];
  sessions: { Asia: number | null; London: number | null; 'New York': number | null };
  rDist: { id: string; bucket: string; count: number; negative: boolean }[];
  rStats: { median: number; tailLoss: number; pctTwoR: number };
  calibration: { id: string; bucket: string; winRate: number; trades: number }[];
  monthly: { id: string; label: string; value: number }[];
  streaks: {
    maxWinStreak: number;
    maxLossStreak: number;
    avgWinR: number;
    avgLossR: number;
    largestWinR: number;
    largestLossR: number;
  };
  weekly: { best: number; worst: number; profitable: number; total: number };
  trades: BacktestTrade[];
}

const MODULE_NAMES: Record<ModuleKey, string> = {
  confluence: 'Confluence',
  pullback: 'Pullback',
  breakout: 'Breakout',
  meanrev: 'Mean Rev',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function sessionOf(hourUtc: number): 'Asia' | 'London' | 'New York' {
  if (hourUtc >= 13 && hourUtc < 21) return 'New York';
  if (hourUtc >= 7 && hourUtc < 13) return 'London';
  return 'Asia';
}

function median(arr: number[]) {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Replay the signal engine across real historical 1m klines. */
export function runBacktest(klines: RawKline[], params: BacktestParams): BacktestResult | null {
  if (klines.length < 120) return null;
  const candles = buildCandles(klines);
  const htfAt = htfBias(klines, 5);
  const htf15 = htfBias(klines, 15);
  const cfg = {
    minConfidence: params.minConfidence,
    slAtr: params.slAtr,
    tp1R: params.tp1R,
    tp2R: params.tp2R,
    cooldownBars: 3,
  };
  const costPrice = params.spread + params.slippage * 2;

  const trades: Array<BacktestTrade & { outcomeKey: string; ts: number; moduleKey: ModuleKey }> = [];
  const perDay = new Map<string, number>();
  let lastEntry = -999;
  const lastIndex = candles.length - 1 - MAX_RESOLVE_BARS;

  for (let i = 55; i <= lastIndex; i++) {
    if (i - lastEntry < cfg.cooldownBars) continue;
    const bias5 = htfAt(i);
    const bias15 = htf15(i);
    const htf = bias5 !== 0 && bias5 === bias15 ? bias5 : 0;
    const ev = evaluateAt(candles, i, htf);
    if (!ev) continue;
    const cand = bestCandidate(ev, cfg);
    if (!cand) continue;
    if (params.htfFilter) {
      if (cand.side === 'LONG' && htf < 0) continue;
      if (cand.side === 'SHORT' && htf > 0) continue;
    }
    const c = candles[i];
    const day = fmtDate(c.openTime);
    const n = perDay.get(day) ?? 0;
    if (n >= params.maxTradesPerDay) continue;
    const lv = levelsFor(cand.side, c.close, c.atr, cfg);
    const res = resolveTrade(candles, i, cand.side, c.close, lv.sl, lv.tp1, lv.tp2, costPrice, cfg.tp1R, cfg.tp2R);
    if (res.rResult === null) continue;
    perDay.set(day, n + 1);
    lastEntry = i;
    const hour = new Date(c.openTime).getUTCHours();
    trades.push({
      id: `bt-${trades.length + 1}`,
      date: day,
      time: fmtClock(c.openTime),
      side: cand.side,
      module: cand.module,
      moduleKey: cand.module,
      entry: c.close,
      exit: +res.exitPrice.toFixed(2),
      confidence: cand.confidence,
      holdMin: res.barsHeld,
      rResult: res.rResult,
      session: sessionOf(hour),
      outcomeKey: res.outcome,
      ts: c.openTime,
    });
  }

  if (trades.length === 0) return null;

  const wins = trades.filter((t) => t.rResult > 0);
  const losses = trades.filter((t) => t.rResult < 0);
  const grossWin = wins.reduce((a, t) => a + t.rResult, 0);
  const grossLoss = Math.abs(losses.reduce((a, t) => a + t.rResult, 0));
  const totalR = trades.reduce((a, t) => a + t.rResult, 0);
  const spanDays = Math.max((candles[candles.length - 1].openTime - candles[0].openTime) / 86_400_000, 1 / 24);

  // Equity curve: compounding riskPct per 1R, sampled per trade
  let eq = 100;
  let peak = 100;
  let maxDd = 0;
  let ddStartIdx = 0;
  let recoveryBars = 0;
  const equity: EquityPoint[] = [];
  const returns: number[] = [];
  trades.forEach((t, idx) => {
    const before = eq;
    eq = eq * (1 + (t.rResult * params.riskPct) / 100);
    returns.push((eq - before) / before);
    if (eq > peak) {
      if (peak - 0 > 0 && idx - ddStartIdx > recoveryBars && maxDd > 0) recoveryBars = idx - ddStartIdx;
      peak = eq;
      ddStartIdx = idx;
    }
    const dd = ((eq - peak) / peak) * 100;
    maxDd = Math.min(maxDd, dd);
    equity.push({ id: `eq-${idx + 1}`, label: `${t.date.slice(5)} ${t.time}`, equity: +eq.toFixed(3), drawdown: +dd.toFixed(3) });
  });
  const meanRet = returns.reduce((a, b) => a + b, 0) / returns.length;
  const sd = Math.sqrt(returns.reduce((a, b) => a + (b - meanRet) ** 2, 0) / returns.length);
  const tradesPerDay = trades.length / spanDays;
  const sharpe = sd > 0 ? (meanRet / sd) * Math.sqrt(Math.max(tradesPerDay * 365, 1)) : 0;

  const avgWin = wins.length ? grossWin / wins.length : 0;
  const avgLoss = losses.length ? grossLoss / losses.length : 0;

  // Module stats
  const moduleStats: ModuleStat[] = (Object.keys(MODULE_NAMES) as ModuleKey[]).map((k) => {
    const ts = trades.filter((t) => t.moduleKey === k);
    const w = ts.filter((t) => t.rResult > 0);
    const gw = w.reduce((a, t) => a + t.rResult, 0);
    const gl = Math.abs(ts.filter((t) => t.rResult < 0).reduce((a, t) => a + t.rResult, 0));
    return {
      id: `mod-${k}`,
      key: k,
      module: MODULE_NAMES[k],
      winRate: ts.length ? +((w.length / ts.length) * 100).toFixed(1) : 0,
      profitFactor: gl > 0 ? +(gw / gl).toFixed(2) : gw > 0 ? 99 : 0,
      trades: ts.length,
    };
  });

  // Hourly (2h buckets)
  const hourly = Array.from({ length: 12 }, (_, b) => {
    const h = b * 2;
    const ts = trades.filter((t) => {
      const hr = new Date(t.ts).getUTCHours();
      return hr >= h && hr < h + 2;
    });
    const w = ts.filter((t) => t.rResult > 0).length;
    return { id: `h-${h}`, hour: h < 10 ? `0${h}` : `${h}`, winRate: ts.length ? +((w / ts.length) * 100).toFixed(0) : 0, trades: ts.length };
  });

  const sessionRate = (s: 'Asia' | 'London' | 'New York') => {
    const ts = trades.filter((t) => t.session === s);
    if (ts.length === 0) return null;
    return +((ts.filter((t) => t.rResult > 0).length / ts.length) * 100).toFixed(1);
  };

  // R distribution
  const bucketDefs: Array<{ id: string; bucket: string; test: (r: number) => boolean; negative: boolean }> = [
    { id: 'r-m3', bucket: '≤ -2R', test: (r) => r <= -1.75, negative: true },
    { id: 'r-m15', bucket: '-1.5R', test: (r) => r > -1.75 && r <= -1.25, negative: true },
    { id: 'r-m1', bucket: '-1R', test: (r) => r > -1.25 && r <= -0.75, negative: true },
    { id: 'r-m05', bucket: '-0.5R', test: (r) => r > -0.75 && r < -0.25, negative: true },
    { id: 'r-0', bucket: '0R', test: (r) => r >= -0.25 && r <= 0.25, negative: false },
    { id: 'r-05', bucket: '+0.5R', test: (r) => r > 0.25 && r < 0.75, negative: false },
    { id: 'r-1', bucket: '+1R', test: (r) => r >= 0.75 && r < 1.25, negative: false },
    { id: 'r-15', bucket: '+1.5R', test: (r) => r >= 1.25 && r < 1.75, negative: false },
    { id: 'r-2', bucket: '+2R', test: (r) => r >= 1.75 && r < 2.5, negative: false },
    { id: 'r-3', bucket: '≥ +2.5R', test: (r) => r >= 2.5, negative: false },
  ];
  const rDist = bucketDefs.map((b) => ({ id: b.id, bucket: b.bucket, negative: b.negative, count: trades.filter((t) => b.test(t.rResult)).length }));
  const rs = trades.map((t) => t.rResult);

  // Calibration
  const calDefs = [
    { id: 'cal-50', bucket: '50–69', lo: 0, hi: 69 },
    { id: 'cal-70', bucket: '70–79', lo: 70, hi: 79 },
    { id: 'cal-80', bucket: '80–89', lo: 80, hi: 89 },
    { id: 'cal-90', bucket: '90–100', lo: 90, hi: 100 },
  ];
  const calibration = calDefs
    .map((d) => {
      const ts = trades.filter((t) => t.confidence >= d.lo && t.confidence <= d.hi);
      const w = ts.filter((t) => t.rResult > 0).length;
      return { id: d.id, bucket: d.bucket, winRate: ts.length ? +((w / ts.length) * 100).toFixed(1) : 0, trades: ts.length };
    })
    .filter((d) => d.trades > 0);

  // Monthly returns (sum of R * riskPct)
  const monthMap = new Map<string, number>();
  trades.forEach((t) => {
    const key = t.date.slice(0, 7);
    monthMap.set(key, (monthMap.get(key) ?? 0) + t.rResult * params.riskPct);
  });
  const monthly = Array.from(monthMap.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, value]) => ({ id: `mo-${key}`, label: `${MONTHS[Number(key.slice(5, 7)) - 1]} ${key.slice(2, 4)}`, value: +value.toFixed(2) }));

  // Streaks
  let curW = 0;
  let curL = 0;
  let maxW = 0;
  let maxL = 0;
  trades.forEach((t) => {
    if (t.rResult > 0) {
      curW++;
      curL = 0;
    } else if (t.rResult < 0) {
      curL++;
      curW = 0;
    }
    maxW = Math.max(maxW, curW);
    maxL = Math.max(maxL, curL);
  });

  // Weekly
  const weekMap = new Map<number, number>();
  trades.forEach((t) => {
    const wk = Math.floor(t.ts / (7 * 86_400_000));
    weekMap.set(wk, (weekMap.get(wk) ?? 0) + t.rResult * params.riskPct);
  });
  const weeks = Array.from(weekMap.values());

  const tradesOut: BacktestTrade[] = trades
    .map((t, idx) => ({
      id: `bt-${(idx + 1).toString().padStart(4, '0')}`,
      date: t.date,
      time: t.time,
      side: t.side,
      module: t.module,
      entry: t.entry,
      exit: t.exit,
      confidence: t.confidence,
      holdMin: t.holdMin,
      rResult: t.rResult,
      session: t.session,
    }))
    .reverse();

  return {
    ranAt: Date.now(),
    from: candles[0].openTime,
    to: candles[candles.length - 1].openTime,
    bars: candles.length,
    params,
    kpis: {
      winRate: +((wins.length / trades.length) * 100).toFixed(1),
      wins: wins.length,
      losses: losses.length,
      profitFactor: grossLoss > 0 ? +(grossWin / grossLoss).toFixed(2) : grossWin > 0 ? 99 : 0,
      expectancy: +(totalR / trades.length).toFixed(2),
      maxDrawdown: +Math.abs(maxDd).toFixed(2),
      totalTrades: trades.length,
      tradesPerDay: +tradesPerDay.toFixed(1),
      avgRR: avgLoss > 0 ? +(avgWin / avgLoss).toFixed(2) : 0,
      sharpe: +sharpe.toFixed(2),
      avgHoldMin: +(trades.reduce((a, t) => a + t.holdMin, 0) / trades.length).toFixed(1),
      recoveryBars,
    },
    equity,
    moduleStats,
    hourly,
    sessions: { Asia: sessionRate('Asia'), London: sessionRate('London'), 'New York': sessionRate('New York') },
    rDist,
    rStats: {
      median: +median(rs).toFixed(2),
      tailLoss: +Math.min(...rs).toFixed(2),
      pctTwoR: +((rs.filter((r) => r >= 1.75).length / rs.length) * 100).toFixed(1),
    },
    calibration,
    monthly,
    streaks: {
      maxWinStreak: maxW,
      maxLossStreak: maxL,
      avgWinR: +avgWin.toFixed(2),
      avgLossR: +(-avgLoss).toFixed(2),
      largestWinR: +Math.max(...rs).toFixed(2),
      largestLossR: +Math.min(...rs).toFixed(2),
    },
    weekly: {
      best: weeks.length ? +Math.max(...weeks).toFixed(2) : 0,
      worst: weeks.length ? +Math.min(...weeks).toFixed(2) : 0,
      profitable: weeks.filter((w) => w > 0).length,
      total: weeks.length,
    },
    trades: tradesOut,
  };
}
