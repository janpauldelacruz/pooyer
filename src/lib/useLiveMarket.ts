'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RawKline } from './types';
import { DataSourceId, getDataSource, ICM_FEED } from './settings';

const DEFAULT_SOURCE: DataSourceId = 'icmarkets';
type BinanceSourceId = Exclude<DataSourceId, 'icmarkets'>;
const WS_STREAMS = 'btcusdt@kline_1m/btcusdt@bookTicker/btcusdt@miniTicker';

type Row = (string | number)[];

function parseKline(r: Row): RawKline {
  return {
    openTime: Number(r[0]),
    open: Number(r[1]),
    high: Number(r[2]),
    low: Number(r[3]),
    close: Number(r[4]),
    volume: Number(r[5]),
  };
}

/** Fetch up to `total` real Binance 1m klines (paginated backwards, 1000 per request). */
async function fetchBinanceKlines(
  total: number,
  signal: AbortSignal | undefined,
  source: BinanceSourceId
): Promise<RawKline[]> {
  const REST = getDataSource(source).rest;
  let endTime: number | undefined;
  let all: RawKline[] = [];
  while (all.length < total) {
    const limit = Math.min(1000, total - all.length);
    const url = `${REST}?symbol=BTCUSDT&interval=1m&limit=${limit}${endTime ? `&endTime=${endTime}` : ''}`;
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`Market data request failed (${res.status})`);
    const rows = (await res.json()) as Row[];
    if (!rows.length) break;
    const batch = rows.map(parseKline);
    all = [...batch, ...all];
    endTime = batch[0].openTime - 1;
    if (rows.length < limit) break;
  }
  return all;
}

/* ---------------- IC Markets SC feed (Supabase, pushed by the MT5 EA) ---------------- */

interface IcmQuote {
  bid: number;
  ask: number;
  day_open: number | null;
  day_high: number | null;
  day_low: number | null;
  updated_at: string;
}
interface IcmBar {
  open_time_ms: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const ICM_HEADERS = { apikey: ICM_FEED.key };
const ICM_POLL_MS = 1000;
/** Quote considered stale when it has not changed for this long (local clock, skew-proof). */
const ICM_STALE_MS = 15_000;
/** Switch to Binance backup after this long without a fresh quote. */
const ICM_FALLBACK_MS = 45_000;

async function icmGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${ICM_FEED.url}/rest/v1/${path}`, { headers: ICM_HEADERS, signal, cache: 'no-store' });
  if (!res.ok) throw new Error(`IC Markets feed request failed (${res.status})`);
  return (await res.json()) as T;
}

async function fetchIcmQuote(signal?: AbortSignal): Promise<IcmQuote | null> {
  const rows = await icmGet<IcmQuote[]>(
    `feed_quote?symbol=eq.${ICM_FEED.symbol}&select=bid,ask,day_open,day_high,day_low,updated_at`,
    signal
  );
  return rows[0] ?? null;
}

const toKline = (b: IcmBar): RawKline => ({
  openTime: Number(b.open_time_ms),
  open: b.open,
  high: b.high,
  low: b.low,
  close: b.close,
  volume: b.volume,
});

async function fetchIcmBars(limit: number, sinceMs?: number, signal?: AbortSignal): Promise<RawKline[]> {
  const filter = sinceMs !== undefined ? `&open_time_ms=gte.${sinceMs}` : '';
  const rows = await icmGet<IcmBar[]>(
    `feed_bars?symbol=eq.${ICM_FEED.symbol}${filter}&select=open_time_ms,open,high,low,close,volume&order=open_time_ms.desc&limit=${limit}`,
    signal
  );
  return rows.map(toKline).reverse();
}

/** True when the EA has pushed a quote within the last minute. */
export async function icmFeedIsFresh(signal?: AbortSignal): Promise<boolean> {
  try {
    const q = await fetchIcmQuote(signal);
    return !!q && Date.now() - Date.parse(q.updated_at) < 60_000;
  } catch {
    return false;
  }
}

/**
 * Fetch up to `total` real 1m candles. IC Markets SC keeps ~3 days of M1 history; when the
 * feed is offline or holds too little history (e.g. long backtests), this uses Binance instead.
 */
export async function fetchHistoricalKlines(
  total: number,
  signal?: AbortSignal,
  source: DataSourceId = DEFAULT_SOURCE
): Promise<RawKline[]> {
  if (source === 'icmarkets') {
    try {
      if (await icmFeedIsFresh(signal)) {
        const bars = await fetchIcmBars(Math.min(total, 5000), undefined, signal);
        if (bars.length >= Math.min(total, 5000) * 0.9) return bars;
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') throw e;
    }
    return fetchBinanceKlines(total, signal, 'binance');
  }
  return fetchBinanceKlines(total, signal, source);
}

export type LiveStatus = 'connecting' | 'live' | 'reconnecting' | 'stale' | 'error';

export interface LiveMarket {
  klines: RawKline[];
  price: number | null;
  prevPrice: number | null;
  spread: number | null;
  bid: number | null;
  ask: number | null;
  open24h: number | null;
  high24h: number | null;
  low24h: number | null;
  lastTickAt: number | null;
  status: LiveStatus;
  error: string | null;
  /** Feed actually in use (IC Markets SC, or a Binance source). */
  activeSource: DataSourceId;
  /** True when IC Markets SC was requested but the site is running on the Binance backup. */
  usingBackup: boolean;
}

const INITIAL: LiveMarket = {
  klines: [],
  price: null,
  prevPrice: null,
  spread: null,
  bid: null,
  ask: null,
  open24h: null,
  high24h: null,
  low24h: null,
  lastTickAt: null,
  status: 'connecting',
  error: null,
  activeSource: DEFAULT_SOURCE,
  usingBackup: false,
};

/** Live BTCUSD market from Binance: REST seed of real 1m candles + WebSocket stream. */
function useBinanceFeed(seedBars: number, source: BinanceSourceId, enabled: boolean): LiveMarket {
  const [state, setState] = useState<LiveMarket>(INITIAL);
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);
  const closedRef = useRef(false);
  const lastMsgRef = useRef(0);

  const applyKline = useCallback((k: RawKline) => {
    lastMsgRef.current = Date.now();
    setState((s) => {
      const arr = s.klines.slice();
      const last = arr[arr.length - 1];
      if (last && last.openTime === k.openTime) arr[arr.length - 1] = k;
      else if (!last || k.openTime > last.openTime) arr.push(k);
      if (arr.length > seedBars + 120) arr.splice(0, arr.length - (seedBars + 120));
      return {
        ...s,
        klines: arr,
        prevPrice: s.price,
        price: k.close,
        lastTickAt: Date.now(),
        status: s.status === 'stale' ? 'live' : s.status,
      };
    });
  }, [seedBars]);

  useEffect(() => {
    if (!enabled) return;
    closedRef.current = false;
    retryRef.current = 0;
    lastMsgRef.current = 0;
    setState({ ...INITIAL, activeSource: source });
    const src = getDataSource(source);
    const WS_URL = `${src.ws}?streams=${WS_STREAMS}`;
    const ctrl = new AbortController();
    let timer: ReturnType<typeof setTimeout> | null = null;

    // Backfill any candles missed while the socket was down, then merge by openTime.
    const backfill = () => {
      fetchBinanceKlines(30, ctrl.signal, source)
        .then((rows) => {
          if (closedRef.current || !rows.length) return;
          setState((s) => {
            const map = new Map<number, RawKline>();
            s.klines.forEach((k) => map.set(k.openTime, k));
            rows.forEach((k) => map.set(k.openTime, k));
            const merged = Array.from(map.values()).sort((a, b) => a.openTime - b.openTime);
            const trimmed = merged.length > seedBars + 120 ? merged.slice(merged.length - (seedBars + 120)) : merged;
            const last = trimmed[trimmed.length - 1];
            return { ...s, klines: trimmed, price: last ? last.close : s.price };
          });
        })
        .catch(() => undefined);
    };

    const connect = () => {
      if (closedRef.current) return;
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;
      ws.onopen = () => {
        const wasRetry = retryRef.current > 0;
        retryRef.current = 0;
        lastMsgRef.current = Date.now();
        setState((s) => ({ ...s, status: 'live', error: null }));
        if (wasRetry) backfill();
      };
      ws.onmessage = (ev) => {
        lastMsgRef.current = Date.now();
        try {
          const msg = JSON.parse(ev.data as string) as { stream: string; data: Record<string, unknown> };
          const d = msg.data;
          if (msg.stream.endsWith('@kline_1m')) {
            const k = d.k as { t: number; o: string; h: string; l: string; c: string; v: string };
            applyKline({ openTime: k.t, open: +k.o, high: +k.h, low: +k.l, close: +k.c, volume: +k.v });
          } else if (msg.stream.endsWith('@bookTicker')) {
            const bid = Number(d.b);
            const ask = Number(d.a);
            setState((s) => ({ ...s, bid, ask, spread: +(ask - bid).toFixed(2) }));
          } else if (msg.stream.endsWith('@miniTicker')) {
            setState((s) => ({ ...s, open24h: Number(d.o), high24h: Number(d.h), low24h: Number(d.l) }));
          }
        } catch {
          // ignore malformed frames
        }
      };
      ws.onerror = () => ws.close();
      ws.onclose = () => {
        if (closedRef.current) return;
        setState((s) => ({ ...s, status: 'reconnecting' }));
        retryRef.current += 1;
        timer = setTimeout(connect, Math.min(1000 * 2 ** retryRef.current, 15000));
      };
    };

    // Watchdog: an open socket that has gone silent is not "live"; force a reconnect.
    const watchdog = setInterval(() => {
      if (closedRef.current || lastMsgRef.current === 0) return;
      const silentMs = Date.now() - lastMsgRef.current;
      if (silentMs > 20_000) {
        setState((s) => (s.status === 'live' ? { ...s, status: 'stale' } : s));
        wsRef.current?.close();
      } else if (silentMs > 8_000) {
        setState((s) => (s.status === 'live' ? { ...s, status: 'stale' } : s));
      }
    }, 2000);

    fetchBinanceKlines(seedBars, ctrl.signal, source)
      .then((klines) => {
        if (closedRef.current) return;
        const last = klines[klines.length - 1];
        setState((s) => ({ ...s, klines, price: last?.close ?? null, prevPrice: last?.close ?? null, lastTickAt: Date.now() }));
        connect();
      })
      .catch((e: unknown) => {
        if (closedRef.current || (e instanceof DOMException && e.name === 'AbortError')) return;
        setState((s) => ({ ...s, status: 'error', error: e instanceof Error ? e.message : 'Unable to load market data' }));
      });

    return () => {
      closedRef.current = true;
      ctrl.abort();
      clearInterval(watchdog);
      if (timer) clearTimeout(timer);
      wsRef.current?.close();
    };
  }, [seedBars, applyKline, source, enabled]);

  return state;
}

/** Live BTCUSD from IC Markets SC: Supabase rows pushed every ~1s by the MT5 LiveSignalsFeed EA. */
function useIcmFeed(seedBars: number, enabled: boolean, onOffline: () => void): LiveMarket {
  const [state, setState] = useState<LiveMarket>({ ...INITIAL, activeSource: 'icmarkets' });
  const offlineRef = useRef(onOffline);
  offlineRef.current = onOffline;

  useEffect(() => {
    if (!enabled) return;
    let closed = false;
    const ctrl = new AbortController();
    let timer: ReturnType<typeof setTimeout> | null = null;
    let lastUpdatedAt = '';
    let lastChangeAt = Date.now();
    let failures = 0;
    let lastOpen = 0;
    setState({ ...INITIAL, activeSource: 'icmarkets' });

    const goOffline = () => {
      if (closed) return;
      closed = true;
      ctrl.abort();
      offlineRef.current();
    };

    const applyQuote = (q: IcmQuote) => {
      if (q.updated_at !== lastUpdatedAt) {
        lastUpdatedAt = q.updated_at;
        lastChangeAt = Date.now();
      }
      const silent = Date.now() - lastChangeAt;
      setState((s) => ({
        ...s,
        prevPrice: s.price,
        price: q.bid,
        bid: q.bid,
        ask: q.ask,
        spread: +(q.ask - q.bid).toFixed(2),
        open24h: q.day_open ?? s.open24h,
        high24h: q.day_high ?? s.high24h,
        low24h: q.day_low ?? s.low24h,
        lastTickAt: lastChangeAt,
        status: silent > ICM_STALE_MS ? 'stale' : 'live',
        error: null,
      }));
      if (silent > ICM_FALLBACK_MS) goOffline();
    };

    const mergeBars = (rows: RawKline[]) => {
      if (!rows.length) return;
      lastOpen = Math.max(lastOpen, rows[rows.length - 1].openTime);
      setState((s) => {
        const map = new Map<number, RawKline>();
        s.klines.forEach((k) => map.set(k.openTime, k));
        rows.forEach((k) => map.set(k.openTime, k));
        const merged = Array.from(map.values()).sort((a, b) => a.openTime - b.openTime);
        const trimmed = merged.length > seedBars + 120 ? merged.slice(merged.length - (seedBars + 120)) : merged;
        return { ...s, klines: trimmed };
      });
    };

    const poll = async () => {
      if (closed) return;
      try {
        const [q, bars] = await Promise.all([
          fetchIcmQuote(ctrl.signal),
          fetchIcmBars(10, lastOpen || undefined, ctrl.signal),
        ]);
        failures = 0;
        if (!q) return goOffline();
        mergeBars(bars);
        applyQuote(q);
      } catch (e) {
        if (closed || (e instanceof DOMException && e.name === 'AbortError')) return;
        failures += 1;
        setState((s) => ({ ...s, status: 'reconnecting' }));
        if (failures >= 5) return goOffline();
      }
      if (!closed) timer = setTimeout(poll, ICM_POLL_MS);
    };

    (async () => {
      try {
        const q = await fetchIcmQuote(ctrl.signal);
        if (!q || Date.now() - Date.parse(q.updated_at) > 60_000) return goOffline();
        const seed = await fetchIcmBars(seedBars, undefined, ctrl.signal);
        if (seed.length < 30) return goOffline();
        lastUpdatedAt = q.updated_at;
        setState((s) => ({ ...s, klines: seed }));
        lastOpen = seed[seed.length - 1].openTime;
        applyQuote(q);
        timer = setTimeout(poll, ICM_POLL_MS);
      } catch (e) {
        if (!(e instanceof DOMException && e.name === 'AbortError')) goOffline();
      }
    })();

    return () => {
      closed = true;
      ctrl.abort();
      if (timer) clearTimeout(timer);
    };
  }, [seedBars, enabled]);

  return state;
}

/**
 * Live BTCUSD market. Default source is IC Markets SC (MT5 feed); if that feed is offline or
 * goes silent, the site switches to the Binance backup and re-checks IC Markets every minute.
 */
export function useLiveMarket(seedBars = 400, source: DataSourceId = DEFAULT_SOURCE): LiveMarket {
  const wantIcm = source === 'icmarkets';
  const [backup, setBackup] = useState(false);
  useEffect(() => setBackup(false), [source]);
  const onOffline = useCallback(() => setBackup(true), []);

  const icm = useIcmFeed(seedBars, wantIcm && !backup, onOffline);
  const binanceSource: BinanceSourceId = wantIcm ? 'binance' : source;
  const bin = useBinanceFeed(seedBars, binanceSource, !wantIcm || backup);

  // While on backup, re-check the IC Markets feed every minute and switch back when it is live.
  useEffect(() => {
    if (!wantIcm || !backup) return;
    const id = setInterval(async () => {
      if (await icmFeedIsFresh()) setBackup(false);
    }, 60_000);
    return () => clearInterval(id);
  }, [wantIcm, backup]);

  if (wantIcm && !backup) return { ...icm, activeSource: 'icmarkets', usingBackup: false };
  return { ...bin, activeSource: binanceSource, usingBackup: wantIcm && backup };
}
