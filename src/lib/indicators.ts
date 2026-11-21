import { Candle, RawKline } from './types';

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

export function fmtClock(ms: number, withSeconds = false) {
  const d = new Date(ms);
  const base = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  return withSeconds ? `${base}:${pad(d.getUTCSeconds())}` : base;
}

export function fmtDate(ms: number) {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Build candles with indicators computed from real klines only. */
export function buildCandles(klines: RawKline[]): Candle[] {
  const out: Candle[] = [];
  if (klines.length === 0) return out;

  const k9 = 2 / 10;
  const k21 = 2 / 22;
  const k50 = 2 / 51;
  const kMacdFast = 2 / 13;
  const kMacdSlow = 2 / 27;
  const kSignal = 2 / 10;

  let ema9 = klines[0].close;
  let ema21 = klines[0].close;
  let ema50 = klines[0].close;
  let macdFast = klines[0].close;
  let macdSlow = klines[0].close;
  let signal = 0;
  let avgGain = 0;
  let avgLoss = 0;
  let atr = 0;
  let vwapNum = 0;
  let vwapDen = 0;
  let vwapDay = -1;
  const closes: number[] = [];

  for (let i = 0; i < klines.length; i++) {
    const k = klines[i];
    const prevClose = i > 0 ? klines[i - 1].close : k.open;

    if (i > 0) {
      ema9 = ema9 + (k.close - ema9) * k9;
      ema21 = ema21 + (k.close - ema21) * k21;
      ema50 = ema50 + (k.close - ema50) * k50;
      macdFast = macdFast + (k.close - macdFast) * kMacdFast;
      macdSlow = macdSlow + (k.close - macdSlow) * kMacdSlow;
    }
    const macd = macdFast - macdSlow;
    signal = signal + (macd - signal) * kSignal;
    const hist = macd - signal;

    const change = k.close - prevClose;
    const gain = Math.max(change, 0);
    const loss = Math.max(-change, 0);
    if (i < 14) {
      avgGain = (avgGain * i + gain) / (i + 1);
      avgLoss = (avgLoss * i + loss) / (i + 1);
    } else {
      avgGain = (avgGain * 13 + gain) / 14;
      avgLoss = (avgLoss * 13 + loss) / 14;
    }
    const rsi = avgLoss === 0 ? (avgGain === 0 ? 50 : 100) : 100 - 100 / (1 + avgGain / avgLoss);

    const tr = Math.max(k.high - k.low, Math.abs(k.high - prevClose), Math.abs(k.low - prevClose));
    atr = i < 14 ? (atr * i + tr) / (i + 1) : (atr * 13 + tr) / 14;

    const day = Math.floor(k.openTime / 86_400_000);
    if (day !== vwapDay) {
      vwapDay = day;
      vwapNum = 0;
      vwapDen = 0;
    }
    const typical = (k.high + k.low + k.close) / 3;
    vwapNum += typical * k.volume;
    vwapDen += k.volume;
    const vwap = vwapDen > 0 ? vwapNum / vwapDen : k.close;

    closes.push(k.close);
    const win = closes.slice(-20);
    const mean = win.reduce((a, b) => a + b, 0) / win.length;
    const variance = win.reduce((a, b) => a + (b - mean) ** 2, 0) / win.length;
    const sd = Math.sqrt(variance);

    out.push({
      id: `candle-${k.openTime}`,
      openTime: k.openTime,
      time: fmtClock(k.openTime),
      open: k.open,
      high: k.high,
      low: k.low,
      close: k.close,
      volume: +k.volume.toFixed(3),
      ema9: +ema9.toFixed(2),
      ema21: +ema21.toFixed(2),
      ema50: +ema50.toFixed(2),
      vwap: +vwap.toFixed(2),
      bbMid: +mean.toFixed(2),
      bbUpper: +(mean + sd * 2).toFixed(2),
      bbLower: +(mean - sd * 2).toFixed(2),
      rsi: +rsi.toFixed(1),
      macdHist: +hist.toFixed(2),
      atr: +atr.toFixed(2),
      mark: null,
      markSide: null,
    });
  }
  return out;
}

/** Aggregate 1m klines into N-minute klines for higher-timeframe bias. */
export function aggregate(klines: RawKline[], minutes: number): RawKline[] {
  const bucketMs = minutes * 60_000;
  const out: RawKline[] = [];
  for (const k of klines) {
    const bucket = Math.floor(k.openTime / bucketMs) * bucketMs;
    const last = out[out.length - 1];
    if (last && last.openTime === bucket) {
      last.high = Math.max(last.high, k.high);
      last.low = Math.min(last.low, k.low);
      last.close = k.close;
      last.volume += k.volume;
    } else {
      out.push({ ...k, openTime: bucket });
    }
  }
  return out;
}

/** HTF bias at each 1m index: +1 bullish (ema9 > ema21), -1 bearish, 0 flat. */
export function htfBias(klines: RawKline[], minutes: number): (idx: number) => number {
  const agg = aggregate(klines, minutes);
  const candles = buildCandles(agg);
  const map = new Map<number, number>();
  candles.forEach((c) => {
    const diff = c.ema9 - c.ema21;
    const thresh = c.atr * 0.05;
    map.set(c.openTime, diff > thresh ? 1 : diff < -thresh ? -1 : 0);
  });
  const bucketMs = minutes * 60_000;
  return (idx: number) => {
    const k = klines[idx];
    if (!k) return 0;
    // use the previous completed HTF bar to avoid look-ahead
    const bucket = Math.floor(k.openTime / bucketMs) * bucketMs - bucketMs;
    return map.get(bucket) ?? 0;
  };
}
