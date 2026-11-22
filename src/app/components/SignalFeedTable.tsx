'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Search, ArrowUp, ArrowDown, Radio, Eye, Copy } from 'lucide-react';
import { toast } from 'sonner';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Tooltip from '@/components/ui/Tooltip';
import EmptyState from '@/components/ui/EmptyState';
import { MODULE_SHORT, SignalRow, Outcome } from '@/lib/types';
import type { LiveAnalysis } from '@/lib/liveAnalysis';
import { fmtPrice, fmtR } from '@/lib/format';

type SortKey = 'time' | 'confidence' | 'rr' | 'rResult';

const OUTCOME_TONE: Record<Outcome, 'success' | 'danger' | 'warn' | 'info' | 'neutral'> = {
  'TP2 Hit': 'success',
  'TP1 Hit': 'success',
  'SL Hit': 'danger',
  Expired: 'neutral',
  Active: 'info',
  Forming: 'warn',
};

const FILTERS = ['All', 'LONG', 'SHORT'] as const;

export default function SignalFeedTable({ analysis }: { analysis: LiveAnalysis | null }) {
  const [query, setQuery] = useState('');
  const [side, setSide] = useState<(typeof FILTERS)[number]>('All');
  const [sortKey, setSortKey] = useState<SortKey>('time');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    const onSearch = (e: Event) => setQuery(String((e as CustomEvent<string>).detail ?? ''));
    window.addEventListener('pooyer:search', onSearch);
    return () => window.removeEventListener('pooyer:search', onSearch);
  }, []);

  const feed: SignalRow[] = useMemo(() => [...(analysis?.signals ?? [])].reverse().slice(0, 60), [analysis?.signals]);

  const rows = useMemo(() => {
    const filtered = feed.filter((r) => {
      const matchSide = side === 'All' || r.side === side;
      const q = query.trim().toLowerCase();
      const matchQ =
        !q ||
        r.id.includes(q) ||
        MODULE_SHORT[r.module].toLowerCase().includes(q) ||
        r.outcome.toLowerCase().includes(q);
      return matchSide && matchQ;
    });
    const sorted = [...filtered].sort((a, b) => {
      const av = sortKey === 'time' ? a.openTime : (a[sortKey] ?? 0);
      const bv = sortKey === 'time' ? b.openTime : (b[sortKey] ?? 0);
      if (av < bv) return dir === 'asc' ? -1 : 1;
      if (av > bv) return dir === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [feed, query, side, sortKey, dir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setDir('desc');
    }
  };

  const toggleRow = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const allSelected = rows.length > 0 && rows.every((r) => selected.includes(r.id));

  const exportCsv = () => {
    const chosen = rows.filter((r) => selected.includes(r.id));
    const header = ['id', 'time_utc', 'side', 'module', 'entry', 'stop', 'target', 'rr', 'confidence', 'outcome', 'r_result'];
    const lines = chosen.map((r) =>
      [r.id, r.time, r.side, MODULE_SHORT[r.module], r.entry, r.sl, r.tp, r.rr.toFixed(2), r.confidence, r.outcome, r.rResult ?? '']
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    );
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'btcusd-signals.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${chosen.length} signals exported`);
    setSelected([]);
  };

  const SortHead = ({ k, label, className = '' }: { k: SortKey; label: string; className?: string }) => (
    <th
      scope="col"
      aria-sort={sortKey === k ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={`px-3 py-1.5 text-left ${className}`}
    >
      <button
        type="button"
        onClick={() => toggleSort(k)}
        className={`label-xs flex items-center gap-1 transition-colors duration-150 hover:text-foreground ${
          sortKey === k ? 'text-primary' : ''
        }`}
      >
        {label}
        {sortKey === k && (dir === 'asc' ? <ArrowUp size={11} aria-hidden="true" /> : <ArrowDown size={11} aria-hidden="true" />)}
      </button>
    </th>
  );

  const copyRow = (r: SignalRow) => {
    toast.success('Signal levels copied', {
      description: `${r.side} @ ${fmtPrice(r.entry)} · SL ${fmtPrice(r.sl)} · TP ${fmtPrice(r.tp)}`,
    });
  };

  return (
    <Card
      title="Signal feed"
      subtitle="Signals generated from live BTCUSD 1m candles with their resolved outcomes"
      action={
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-success">
          <Radio size={13} className="live-dot" aria-hidden="true" /> Live
        </span>
      }
      bodyClassName="p-0"
    >
      <div className="flex flex-col gap-2 border-b border-border p-2.5 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:w-64">
          <label htmlFor="feed-search" className="sr-only">Filter signals</label>
          <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            id="feed-search"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by module, outcome, ID"
            className="w-full rounded-md border border-border bg-input py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={`filter-${f}`}
              type="button"
              onClick={() => setSide(f)}
              aria-pressed={side === f}
              className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition-all duration-150 active:scale-95 ${
                side === f
                  ? 'border-primary/40 bg-primary/10 text-primary' :'border-border bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {f === 'All' ? 'All sides' : f}
            </button>
          ))}
        </div>
      </div>

      {selected.length > 0 && (
        <div className="slide-in flex items-center justify-between border-b border-primary/30 bg-primary/10 px-4 py-2 text-xs">
          <span className="font-semibold text-primary">{selected.length} selected</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={exportCsv}
              className="rounded-md bg-primary px-2.5 py-1 font-semibold text-primary-foreground transition-all duration-150 hover:opacity-90 active:scale-95"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => setSelected([])}
              className="rounded-md bg-secondary px-2.5 py-1 font-semibold text-secondary-foreground transition-all duration-150 hover:bg-muted active:scale-95"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-[13px]">
          <caption className="sr-only">Live BTCUSD signals with entry, stop, target and outcome</caption>
          <thead className="border-b border-border bg-muted/50">
            <tr>
              <th scope="col" className="w-10 px-3 py-2.5">
                <input
                  type="checkbox"
                  aria-label="Select all signals"
                  checked={allSelected}
                  onChange={() => setSelected(allSelected ? [] : rows.map((r) => r.id))}
                  className="h-3.5 w-3.5 cursor-pointer accent-primary"
                />
              </th>
              <SortHead k="time" label="Time (UTC)" />
              <th scope="col" className="label-xs px-3 py-2.5 text-left">Side</th>
              <th scope="col" className="label-xs px-3 py-2.5 text-left">Module</th>
              <th scope="col" className="label-xs px-3 py-2.5 text-right">Entry</th>
              <th scope="col" className="label-xs px-3 py-2.5 text-right">Stop</th>
              <th scope="col" className="label-xs px-3 py-2.5 text-right">Target</th>
              <SortHead k="rr" label="R:R" />
              <SortHead k="confidence" label="Conf." />
              <th scope="col" className="label-xs px-3 py-2.5 text-left">Outcome</th>
              <SortHead k="rResult" label="Result" />
              <th scope="col" className="px-3 py-2.5"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={r.id}
                className={`group border-b border-border transition-colors duration-150 last:border-0 hover:bg-muted/60 ${
                  i % 2 === 1 ? 'bg-muted/20' : ''
                } ${r.outcome === 'Active' ? 'bg-primary/5' : ''}`}
              >
                <td className="px-3 py-2.5">
                  <input
                    type="checkbox"
                    aria-label={`Select signal ${r.id}`}
                    checked={selected.includes(r.id)}
                    onChange={() => toggleRow(r.id)}
                    className="h-3.5 w-3.5 cursor-pointer accent-primary"
                  />
                </td>
                <td className="num px-3 py-2.5 text-muted-foreground">{r.time}</td>
                <td className="px-3 py-2.5">
                  <Badge tone={r.side === 'LONG' ? 'long' : 'short'}>{r.side === 'LONG' ? 'BUY' : 'SELL'}</Badge>
                </td>
                <td className="px-3 py-2.5 text-foreground">{MODULE_SHORT[r.module]}</td>
                <td className="num px-3 py-2.5 text-right text-foreground">{fmtPrice(r.entry)}</td>
                <td className="num px-3 py-2.5 text-right text-destructive">{fmtPrice(r.sl)}</td>
                <td className="num px-3 py-2.5 text-right text-success">{fmtPrice(r.tp)}</td>
                <td className="num px-3 py-2.5 text-muted-foreground">1:{r.rr.toFixed(1)}</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-12 overflow-hidden rounded-full bg-secondary">
                      <div
                        className={`h-full rounded-full ${r.confidence >= 80 ? 'bg-success' : r.confidence >= 70 ? 'bg-primary' : 'bg-warning'}`}
                        style={{ width: `${r.confidence}%` }}
                      />
                    </div>
                    <span className="num text-xs font-semibold text-foreground">{r.confidence}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <Badge tone={OUTCOME_TONE[r.outcome]} dot={r.outcome === 'Active'}>{r.outcome}</Badge>
                </td>
                <td
                  className={`num px-3 py-2.5 text-sm font-semibold ${
                    r.rResult === null
                      ? 'text-muted-foreground'
                      : r.rResult > 0
                      ? 'text-success'
                      : r.rResult < 0
                      ? 'text-destructive' :'text-muted-foreground'
                  }`}
                >
                  {fmtR(r.rResult)}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex justify-end gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                    <Tooltip text="Copy levels" side="top">
                      <button
                        type="button"
                        onClick={() => copyRow(r)}
                        aria-label={`Copy levels for ${r.id}`}
                        className="rounded-md p-1.5 text-muted-foreground transition-all duration-150 hover:bg-secondary hover:text-foreground active:scale-95"
                      >
                        <Copy size={14} />
                      </button>
                    </Tooltip>
                    <Tooltip text="View on chart" side="top">
                      <button
                        type="button"
                        aria-label={`View ${r.id} on chart`}
                        className="rounded-md p-1.5 text-muted-foreground transition-all duration-150 hover:bg-secondary hover:text-foreground active:scale-95"
                      >
                        <Eye size={14} />
                      </button>
                    </Tooltip>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <EmptyState
            icon={<Radio size={20} />}
            title={feed.length === 0 ? 'No live signals yet' : 'No signals match this filter'}
            description={
              feed.length === 0
                ? 'The engine has not found a high-probability setup in the loaded live candles. Signals appear here as they fire.' :'No BTCUSD signals match the side or module you filtered on. Clear the filter to see the full feed.'
            }
            actionLabel="Clear filters"
            onAction={() => {
              setQuery('');
              setSide('All');
            }}
          />
        )}
      </div>

      <div className="flex flex-col items-start justify-between gap-2 border-t border-border px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center">
        <span>
          Showing <span className="num font-semibold text-foreground">{rows.length}</span> of{' '}
          <span className="num font-semibold text-foreground">{feed.length}</span> live signals
        </span>
        <span>Outcomes resolve from real candles when price touches TP1, TP2 or SL; unresolved trades expire after 30 bars</span>
      </div>
    </Card>
  );
}