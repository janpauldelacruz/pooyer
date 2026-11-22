'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RawKline } from './types';
import { DataSourceId, getDataSource } from './settings';

const DEFAULT_SOURCE: DataSourceId = 'binance';
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

/** Fetch up to `total` real 1m klines (paginated backwards, 1000 per request). */
export async function fetchHistoricalKlines(
  total: number,
  signal?: AbortSignal,
  source: DataSourceId = DEFAULT_SOURCE
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
};

/** Live BTCUSD market: REST seed of real 1m candles + Binance WebSocket stream. */
export function useLiveMarket(seedBars = 400, source: DataSourceId = DEFAULT_SOURCE): LiveMarket {
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
    closedRef.current = false;
    retryRef.current = 0;
    lastMsgRef.current = 0;
    setState(INITIAL);
    const src = getDataSource(source);
    const WS_URL = `${src.ws}?streams=${WS_STREAMS}`;
    const ctrl = new AbortController();
    let timer: ReturnType<typeof setTimeout> | null = null;

    // Backfill any candles missed while the socket was down, then merge by openTime.
    const backfill = () => {
      fetchHistoricalKlines(30, ctrl.signal, source)
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

    fetchHistoricalKlines(seedBars, ctrl.signal, source)
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
  }, [seedBars, applyKline, source]);

  return state;
}
