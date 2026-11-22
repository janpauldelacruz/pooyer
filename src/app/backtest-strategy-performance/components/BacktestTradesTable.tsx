'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Search, Download, SlidersHorizontal, History } from 'lucide-react';
import { toast } from 'sonner';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import { MODULE_SHORT, BacktestTrade } from '@/lib/types';
import { fmtPrice, fmtR } from '@/lib/format';

type SortKey = 'date' | 'confidence' | 'holdMin' | 'rResult';

const COLS = [
  { id: 'col-session', key: 'session', label: 'Session' },
  { id: 'col-module', key: 'module', label: 'Module' },
  { id: 'col-exit', key: 'exit', label: 'Exit' },
  { id: 'col-hold', key: 'hold', label: 'Hold' },
] as const;

export default function BacktestTradesTable({ moduleFilter, trades }: { moduleFilter: string; trades: BacktestTrade[] }) {
  const [query, setQuery] = useState('');
  const [side, setSide] = useState<'all' | 'LONG' | 'SHORT'>('all');
  const [result, setResult] = useState<'all' | 'win' | 'loss'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [hidden, setHidden] = useState<string[]>([]);
  const [colMenu, setColMenu] = useState(false);

  const filtered = useMemo(() => {
    const list = trades.filter((t) => {
      if (moduleFilter !== 'all' && t.module !== moduleFilter) return false;
      if (side !== 'all' && t.side !== side) return false;
      if (result === 'win' && t.rResult <= 0) return false;
      if (result === 'loss' && t.rResult >= 0) return false;
      const q = query.trim().toLowerCase();
      if (q && !(t.id.includes(q) || t.session.toLowerCase().includes(q) || MODULE_SHORT[t.module].toLowerCase().includes(q))) return false;
      return true;
    });
    return [...list].sort((a: BacktestTrade, b: BacktestTrade) => {
      const av = sortKey === 'date' ? `${a.date} ${a.time}` : a[sortKey];
      const bv = sortKey === 'date' ? `${b.date} ${b.time}` : b[sortKey];
      if (av < bv) return dir === 'asc' ? -1 : 1;
      if (av > bv) return dir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [trades, moduleFilter, side, result, query, sortKey, dir]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(k);
      setDir('desc');
    }
    setPage(1);
  };

  const isHidden = (key: string) => hidden.includes(key);
  const toggleCol = (key: string) =>
    setHidden((h) => (h.includes(key) ? h.filter((x) => x !== key) : [...h, key]));

  const SortHead = ({ k, label, align = 'left' }: { k: SortKey; label: string; align?: 'left' | 'right' }) => (
    <th
      scope="col"
      aria-sort={sortKey === k ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={`px-3 py-2.5 ${align === 'right' ? 'text-right' : 'text-left'}`}
    >
      <button
        type="button"
        onClick={() => toggleSort(k)}
        className={`label-xs inline-flex items-center gap-1 transition-colors duration-150 hover:text-foreground ${
          sortKey === k ? 'text-primary' : ''
        }`}
      >
        {label}
        {sortKey === k && (dir === 'asc' ? <ArrowUp size={11} aria-hidden="true" /> : <ArrowDown size={11} aria-hidden="true" />)}
      </button>
    </th>
  );

  const exportCsv = () => {
    const header = ['id', 'date', 'time', 'side', 'module', 'session', 'entry', 'exit', 'confidence', 'hold_min', 'r_result'];
    const lines = filtered.map((t) =>
      [t.id, t.date, t.time, t.side, MODULE_SHORT[t.module], t.session, t.entry, t.exit, t.confidence, t.holdMin, t.rResult]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    );
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'backtest-btcusd-1m.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Trade log exported', { description: `${filtered.length} rows · backtest-btcusd-1m.csv` });
  };

  useEffect(() => {
    if (!colMenu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setColMenu(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [colMenu]);

  const pageNumbers = Array.from({ length: pageCount }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === pageCount || Math.abs(p - safePage) <= 1
  );

  return (
    <Card
      title="Backtest trade log"
      subtitle={`${filtered.length} of ${trades.length} replayed trades match · most recent first`}
      action={
        <div className="flex items-center gap-1.5">
          <div className="relative">
            <button
              type="button"
              onClick={() => setColMenu((v) => !v)}
              aria-expanded={colMenu}
              aria-haspopup="true"
              className="flex items-center gap-1.5 rounded-md border border-border bg-secondary px-2.5 py-1.5 text-xs font-semibold text-secondary-foreground transition-all duration-150 hover:bg-muted active:scale-95"
            >
              <SlidersHorizontal size={13} aria-hidden="true" /> Columns
            </button>
            {colMenu && (
              <div className="slide-in absolute right-0 top-full z-20 mt-1.5 w-44 rounded-lg border border-border bg-card p-2 shadow-xl">
                {COLS.map((c) => (
                  <label key={c.id} htmlFor={c.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-foreground hover:bg-secondary">
                    <input
                      id={c.id}
                      type="checkbox"
                      checked={!isHidden(c.key)}
                      onChange={() => toggleCol(c.key)}
                      className="h-3.5 w-3.5 accent-primary"
                    />
                    {c.label}
                  </label>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={exportCsv}
            className="flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground transition-all duration-150 hover:opacity-90 active:scale-95"
          >
            <Download size={13} aria-hidden="true" /> Export CSV
          </button>
        </div>
      }
      bodyClassName="p-0"
    >
      <div className="flex flex-col gap-2 border-b border-border p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:w-64">
          <label htmlFor="bt-search" className="sr-only">Search trades</label>
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            id="bt-search"
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search ID, module, session"
            className="w-full rounded-lg border border-border bg-input py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {(['all', 'LONG', 'SHORT'] as const).map((s) => (
            <button
              key={`side-${s}`}
              type="button"
              aria-pressed={side === s}
              onClick={() => {
                setSide(s);
                setPage(1);
              }}
              className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition-all duration-150 active:scale-95 ${
                side === s ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {s === 'all' ? 'All sides' : s}
            </button>
          ))}
          <span className="mx-1 hidden h-4 w-px bg-border sm:block" aria-hidden="true" />
          {(['all', 'win', 'loss'] as const).map((r) => (
            <button
              key={`res-${r}`}
              type="button"
              aria-pressed={result === r}
              onClick={() => {
                setResult(r);
                setPage(1);
              }}
              className={`rounded-md border px-2.5 py-1 text-xs font-semibold capitalize transition-all duration-150 active:scale-95 ${
                result === r ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {r === 'all' ? 'All results' : r === 'win' ? 'Winners' : 'Losers'}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <caption className="sr-only">Replayed backtest trades with entry, exit, confidence, hold time and result</caption>
          <thead className="border-b border-border bg-muted/50">
            <tr>
              <th scope="col" className="label-xs px-3 py-2.5 text-left">Trade ID</th>
              <SortHead k="date" label="Date / Time" />
              <th scope="col" className="label-xs px-3 py-2.5 text-left">Side</th>
              {!isHidden('module') && <th scope="col" className="label-xs px-3 py-2.5 text-left">Module</th>}
              {!isHidden('session') && <th scope="col" className="label-xs px-3 py-2.5 text-left">Session</th>}
              <th scope="col" className="label-xs px-3 py-2.5 text-right">Entry</th>
              {!isHidden('exit') && <th scope="col" className="label-xs px-3 py-2.5 text-right">Exit</th>}
              <SortHead k="confidence" label="Conf." />
              {!isHidden('hold') && <SortHead k="holdMin" label="Hold" />}
              <SortHead k="rResult" label="Result" align="right" />
            </tr>
          </thead>
          <tbody>
            {rows.map((t, i) => (
              <tr
                key={t.id}
                className={`border-b border-border transition-colors duration-150 last:border-0 hover:bg-muted/60 ${i % 2 === 1 ? 'bg-muted/20' : ''}`}
              >
                <td className="num px-3 py-2.5 text-muted-foreground">{t.id}</td>
                <td className="num px-3 py-2.5 text-foreground">
                  {t.date} <span className="text-muted-foreground">{t.time}</span>
                </td>
                <td className="px-3 py-2.5">
                  <Badge tone={t.side === 'LONG' ? 'long' : 'short'}>{t.side === 'LONG' ? 'BUY' : 'SELL'}</Badge>
                </td>
                {!isHidden('module') && <td className="px-3 py-2.5 text-foreground">{MODULE_SHORT[t.module]}</td>}
                {!isHidden('session') && <td className="px-3 py-2.5 text-muted-foreground">{t.session}</td>}
                <td className="num px-3 py-2.5 text-right text-foreground">{fmtPrice(t.entry)}</td>
                {!isHidden('exit') && <td className="num px-3 py-2.5 text-right text-foreground">{fmtPrice(t.exit)}</td>}
                <td className="px-3 py-2.5">
                  <span
                    className={`num rounded-md px-1.5 py-0.5 text-xs font-bold ${
                      t.confidence >= 80 ? 'bg-success/15 text-success' : t.confidence >= 70 ? 'bg-primary/15 text-primary' : 'bg-warning/15 text-warning'
                    }`}
                  >
                    {t.confidence}
                  </span>
                </td>
                {!isHidden('hold') && <td className="num px-3 py-2.5 text-muted-foreground">{t.holdMin}m</td>}
                <td
                  className={`num px-3 py-2.5 text-right text-sm font-semibold ${
                    t.rResult > 0 ? 'text-success' : t.rResult < 0 ? 'text-destructive' : 'text-muted-foreground'
                  }`}
                >
                  {fmtR(t.rResult)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <EmptyState
            icon={<History size={20} aria-hidden="true" />}
            title="No backtest trades match"
            description="No replayed trades fit this module, side and result combination. Loosen a filter to see the trade log."
            actionLabel="Reset filters"
            onAction={() => {
              setQuery('');
              setSide('all');
              setResult('all');
            }}
          />
        )}
      </div>

      <div className="flex flex-col items-center justify-between gap-2 border-t border-border px-4 py-3 text-xs text-muted-foreground sm:flex-row">
        <div className="flex items-center gap-2">
          <label htmlFor="page-size">Rows</label>
          <select
            id="page-size"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="num rounded-md border border-border bg-input px-2 py-1 text-foreground focus:border-primary focus:outline-none"
          >
            {[6, 12, 24].map((n) => (
              <option key={`ps-${n}`} value={n}>{n}</option>
            ))}
          </select>
          <span>
            <span className="num font-semibold text-foreground">{filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1}</span>–
            <span className="num font-semibold text-foreground">{Math.min(safePage * pageSize, filtered.length)}</span> of{' '}
            <span className="num font-semibold text-foreground">{filtered.length}</span>
          </span>
        </div>
          <nav aria-label="Trade log pagination" className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPage(Math.max(1, safePage - 1))}
            disabled={safePage === 1}
            aria-label="Previous page"
            className="rounded-md border border-border bg-secondary p-1.5 text-secondary-foreground transition-all duration-150 hover:bg-muted active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft size={14} aria-hidden="true" />
          </button>
          {pageNumbers.map((p, idx) => (
            <React.Fragment key={`pg-${p}`}>
              {idx > 0 && p - pageNumbers[idx - 1] > 1 && <span className="px-1">…</span>}
              <button
                type="button"
                onClick={() => setPage(p)}
                aria-current={p === safePage ? 'page' : undefined}
                className={`num min-w-7 rounded-md border px-2 py-1 text-xs font-semibold transition-all duration-150 active:scale-95 ${
                  p === safePage ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-secondary text-secondary-foreground hover:bg-muted'
                }`}
              >
                {p}
              </button>
            </React.Fragment>
          ))}
          <button
            type="button"
            onClick={() => setPage(Math.min(pageCount, safePage + 1))}
            disabled={safePage === pageCount}
            aria-label="Next page"
            className="rounded-md border border-border bg-secondary p-1.5 text-secondary-foreground transition-all duration-150 hover:bg-muted active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight size={14} aria-hidden="true" />
          </button>
        </nav>
      </div>
    </Card>
  );
}