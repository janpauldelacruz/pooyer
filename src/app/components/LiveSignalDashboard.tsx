'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import AppLayout from '@/components/AppLayout';
import LiveTickStrip from './LiveTickStrip';
import HeroSignalCard from './HeroSignalCard';
import PriceChartPanel from './PriceChartPanel';
import ConfluenceChecklist from './ConfluenceChecklist';
import ModuleStatusGrid from './ModuleStatusGrid';
import AlertControlPanel from './AlertControlPanel';
import SignalFeedTable from './SignalFeedTable';
import SessionStatsStrip from './SessionStatsStrip';
import { useLiveMarket } from '@/lib/useLiveMarket';
import { analyze } from '@/lib/liveAnalysis';
import { fmtPrice } from '@/lib/format';
import { SignalRow } from '@/lib/types';

export interface AlertSettings {
  sound: boolean;
  volume: number;
  toasts: boolean;
  minConfidence: number;
  longs: boolean;
  shorts: boolean;
}

export default function LiveSignalDashboard() {
  const market = useLiveMarket(400);
  const [now, setNow] = useState(0);
  const [settings, setSettings] = useState<AlertSettings>({
    sound: true,
    volume: 60,
    toasts: true,
    minConfidence: 70,
    longs: true,
    shorts: true,
  });
  const audioRef = useRef<AudioContext | null>(null);
  const seenRef = useRef<string | null>(null);
  const primedRef = useRef(false);
  const alertedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const lastOpenTime = market.klines[market.klines.length - 1]?.openTime ?? 0;
  const lastClose = market.klines[market.klines.length - 1]?.close ?? 0;
  const feedLive = market.status === 'live';
  // Re-run when candles change, and once per minute boundary so a forming candle becomes "closed"
  const minuteBucket = Math.floor(now / 60_000);

  const rawAnalysis = useMemo(
    () => (now > 0 ? analyze(market.klines, now) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [market.klines, lastOpenTime, lastClose, minuteBucket]
  );

  // Validity countdown must tick each second without recomputing indicators
  const analysis = useMemo(() => {
    if (!rawAnalysis) return null;
    const a = rawAnalysis.active;
    if (!a) return rawAnalysis;
    const ageSec = (now - a.firedAt) / 1000;
    const stillValid = feedLive && ageSec <= a.validForSeconds;
    return stillValid ? rawAnalysis : { ...rawAnalysis, active: null };
  }, [rawAnalysis, now, feedLive]);

  const playBeep = useCallback(
    (side: 'LONG' | 'SHORT') => {
      try {
        const Ctor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        if (!audioRef.current) audioRef.current = new Ctor();
        const ctx = audioRef.current;
        const gain = ctx.createGain();
        gain.gain.value = (settings.volume / 100) * 0.25;
        gain.connect(ctx.destination);
        const freqs = side === 'LONG' ? [660, 880] : [520, 380];
        freqs.forEach((f, i) => {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.value = f;
          osc.connect(gain);
          osc.start(ctx.currentTime + i * 0.14);
          osc.stop(ctx.currentTime + i * 0.14 + 0.12);
        });
      } catch {
        // Audio may be blocked until user interaction; ignore silently
      }
    },
    [settings.volume]
  );

  const announce = useCallback(
    (s: SignalRow) => {
      if (settings.sound) playBeep(s.side);
      if (settings.toasts) {
        toast(`${s.side === 'LONG' ? 'BUY' : 'SELL'} signal · BTCUSD`, {
          description: `Entry ${fmtPrice(s.entry)} · SL ${fmtPrice(s.sl)} · TP ${fmtPrice(s.tp1)} · Confidence ${s.confidence}`,
        });
      }
    },
    [playBeep, settings.sound, settings.toasts]
  );

  // Alert only when a genuinely new live signal is generated
  const activeId = analysis?.active?.id ?? null;
  useEffect(() => {
    if (!analysis) return;
    if (!primedRef.current) {
      // Signals already present at load are history, not new alerts
      primedRef.current = true;
      if (activeId) alertedRef.current.add(activeId);
      return;
    }
    const a = analysis.active;
    if (!a || alertedRef.current.has(a.id)) return;
    alertedRef.current.add(a.id);
    if (a.confidence < settings.minConfidence) return;
    if (a.side === 'LONG' && !settings.longs) return;
    if (a.side === 'SHORT' && !settings.shorts) return;
    announce(a);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const replayAlert = useCallback(
    (side: 'LONG' | 'SHORT') => {
      const a = analysis?.active;
      if (!a) {
        toast('No active signal', { description: 'Alerts fire automatically when the live engine generates a new signal.' });
        return;
      }
      if (settings.sound) playBeep(side);
      if (settings.toasts) {
        toast(`${a.side === 'LONG' ? 'BUY' : 'SELL'} signal · BTCUSD`, {
          description: `Entry ${fmtPrice(a.entry)} · SL ${fmtPrice(a.sl)} · TP ${fmtPrice(a.tp1)} · Confidence ${a.confidence}`,
        });
      }
    },
    [analysis, playBeep, settings.sound, settings.toasts]
  );

  const testAlert = useCallback(
    (side: 'LONG' | 'SHORT') => {
      if (settings.sound) playBeep(side);
      if (settings.toasts) {
        toast(`${side === 'LONG' ? 'BUY' : 'SELL'} alert test`, {
          description: 'Sound and on-screen alerts are working. Real alerts fire from live BTCUSD signals only.',
        });
      }
    },
    [playBeep, settings.sound, settings.toasts]
  );

  return (
    <AppLayout title="Live Signal Dashboard" soundOn={settings.sound} price={market.price} status={market.status}>
      <div className="space-y-4">
        {market.status === 'error' && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Live BTCUSD market data is unavailable: {market.error}. No data is shown until the live feed connects.
          </div>
        )}

        <LiveTickStrip market={market} analysis={analysis} />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="xl:col-span-5">
            <HeroSignalCard
              analysis={analysis}
              price={market.price}
              now={now}
              loading={market.status === 'connecting' || (!analysis && market.status !== 'error')}
              onReplayAlert={replayAlert}
            />
          </div>
          <div className="xl:col-span-7">
            <PriceChartPanel analysis={analysis} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-12">
          <div className="2xl:col-span-4">
            <ConfluenceChecklist analysis={analysis} />
          </div>
          <div className="2xl:col-span-4">
            <ModuleStatusGrid analysis={analysis} />
          </div>
          <div className="lg:col-span-2 2xl:col-span-4">
            <AlertControlPanel settings={settings} onChange={setSettings} onTest={testAlert} />
          </div>
        </div>

        <SessionStatsStrip analysis={analysis} />

        <SignalFeedTable analysis={analysis} />
      </div>
    </AppLayout>
  );
}