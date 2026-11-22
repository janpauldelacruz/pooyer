<div align="center">

# ⚡ pooyer

**Real-time BTC/USD 1-minute scalping signals, computed live in your browser.**

Four rule-based signal modules · closed-candle (non-repainting) logic · live Binance feed · built-in backtester · sound and toast alerts

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=nextdotjs)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss&logoColor=white)
![Recharts](https://img.shields.io/badge/Charts-Recharts-8884d8)
![License](https://img.shields.io/badge/license-MIT-green)

</div>

---

> ## ⚠️ Risk Disclaimer
>
> pooyer is an **educational and research tool**. It is **not financial advice**, and signals are **not guaranteed to be profitable**.
> Trading leveraged instruments such as BTC/USD carries a high risk of loss. Backtest results are simulated, use
> simplified cost assumptions, and **do not predict future performance**. The signal engine has not been validated by
> live trading. Always paper-trade first, and never risk money you cannot afford to lose.

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [How It Works](#-how-it-works)
  - [1. Data Pipeline](#1-data-pipeline)
  - [2. Indicators](#2-indicators)
  - [3. Closed-Candle Rule (No Repainting)](#3-closed-candle-rule-no-repainting)
  - [4. The Seven-Point Confluence Checklist](#4-the-seven-point-confluence-checklist)
  - [5. Signal Modules](#5-signal-modules)
  - [6. Confidence, Levels and Trade Management](#6-confidence-levels-and-trade-management)
  - [7. Signal Lifecycle](#7-signal-lifecycle)
  - [8. Alerts](#8-alerts)
  - [9. Feed Health and Reconnection](#9-feed-health-and-reconnection)
- [Using the App](#-using-the-app)
  - [Live Signals Dashboard](#live-signals-dashboard)
  - [Backtest and Performance](#backtest-and-performance)
- [Configuration](#-configuration)
- [Project Structure](#-project-structure)
- [Scripts](#-scripts)
- [Deployment](#-deployment)
- [Accessibility and SEO](#-accessibility-and-seo)
- [Known Limitations](#-known-limitations)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🔭 Overview

pooyer connects directly to Binance's public market data for **BTCUSDT (1-minute candles)**, computes technical
indicators in the browser, and evaluates four independent signal modules on every **closed** candle. When a module
produces a signal that meets your minimum confidence, the dashboard shows an entry, stop-loss and two take-profit
levels, a countdown for how long the signal stays valid, and fires an optional sound and on-screen alert.

A second page runs the **same signal engine** over up to several days of historical 1-minute data, so you can see how
the rules would have performed, including costs, drawdown, session and hour-of-day breakdowns, and confidence
calibration.

**There is no backend and no database.** All market data is fetched client-side from Binance's public REST and
WebSocket APIs, and all computation runs in your browser. No API keys are required.

---

## ✨ Features

| Area | What you get |
| --- | --- |
| **Live data** | Binance WebSocket stream (kline, best bid/ask, 24h ticker) seeded by ~400 historical 1m candles via REST |
| **Signals** | 4 modules: Confluence, Pullback, Breakout, Mean Reversion, each with a confidence score |
| **No repainting** | Signals, checklist and ATR use **closed candles only**. Once a signal appears it does not change |
| **Trade plan** | Entry, stop-loss (ATR-based), TP1 and TP2, plus a validity countdown and invalidation level |
| **Confluence checklist** | Seven weighted conditions, shown live with pass/fail and the underlying values |
| **Live chart** | Last 60 candles with EMA/VWAP/Bollinger overlays and BUY/SELL markers (the forming candle is the last point) |
| **Alerts** | Sound (WebAudio beep, adjustable volume), toast notifications, per-direction and min-confidence filters, test buttons |
| **Feed watchdog** | Detects a silent feed, marks it **stale**, reconnects, backfills missed candles, and pauses signals and alerts meanwhile |
| **Session stats** | Signals today, wins, losses, expired, net R, win rate, consecutive losses vs. a loss-streak limit |
| **Signal feed** | Sortable, filterable history table with CSV export |
| **Backtester** | Tunable parameters, equity curve, KPIs, module comparison, hourly win rate, R-distribution, calibration, monthly returns, streaks, trade log with CSV export |
| **Accessible** | Skip link, keyboard navigation, ARIA labelling, chart text alternatives, reduced-motion support |

---

## 🧰 Tech Stack

- **Framework:** Next.js 15 (App Router) + React 19
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 3.4 with a custom neon-violet dark theme
- **Charts:** Recharts
- **Icons:** lucide-react, Heroicons
- **Toasts:** sonner
- **Forms:** react-hook-form
- **Data source:** Binance public REST and WebSocket (no key required)

---

## 🚀 Quick Start

### Prerequisites

- **Node.js 18.18+** (Node 20 LTS recommended)
- **npm** (or yarn / pnpm)
- Internet access to `api.binance.com` and `stream.binance.com`

### Install and run

```bash
# 1. Clone
git clone https://github.com/janpauldelacruz/pooyer.git
cd pooyer

# 2. Install dependencies
npm install

# 3. Start the dev server (port 4028)
npm run dev
```

Open **http://localhost:4028**. The dashboard connects to Binance automatically; within a few seconds the status chip
in the sidebar should read **Streaming**.

### Production build

```bash
npm run build
npm run serve      # serves the production build with `next start`
```

> **Note:** `npm run start` runs the dev server on port 4028. Use `npm run serve` for the production server.

---

## 🧠 How It Works

### 1. Data Pipeline

```
 ┌──────────────────────┐        ┌────────────────────────────┐
 │ Binance REST         │        │ Binance WebSocket          │
 │ /api/v3/klines       │        │ btcusdt@kline_1m           │
 │ ~400 × 1m candles    │        │ btcusdt@bookTicker         │
 │ (seed + backfill)    │        │ btcusdt@miniTicker         │
 └──────────┬───────────┘        └─────────────┬──────────────┘
            │                                  │
            └──────────────┬───────────────────┘
                           ▼
                 useLiveMarket()  (src/lib/useLiveMarket.ts)
          merges candles · tracks price/spread/24h · watchdog
                           ▼
                    analyze()  (src/lib/liveAnalysis.ts)
     closed-candle filter → indicators → modules → signals → stats
                           ▼
        Dashboard UI · Chart · Checklist · Alerts · Signal feed
```

1. **Seed:** on load, ~400 real 1m candles are fetched from the REST endpoint (paginated, 1000 per request).
2. **Stream:** a combined WebSocket subscribes to the 1m kline, best bid/ask, and 24h mini-ticker. The latest candle is
   updated in place; a new candle is appended when a new minute opens.
3. **Analyze:** whenever the candle set changes, `analyze()` rebuilds indicators and runs the signal engine.
4. **Render:** the dashboard shows the result. A one-second timer drives countdowns only; indicators are **not**
   recomputed every second, only per candle.

### 2. Indicators

Computed in `src/lib/indicators.ts` from the 1-minute candles:

| Indicator | Parameters |
| --- | --- |
| EMA | 9, 21, 50 |
| RSI | 14 (Wilder smoothing) |
| MACD | 12 / 26 / 9 (line, signal, histogram) |
| ATR | 14 (Wilder smoothing) |
| VWAP | Resets each UTC day |
| Bollinger Bands | 20-period, with %B and band width |
| Volume average | 20-bar |
| Higher-timeframe bias | 5m and 15m EMA alignment (aggregated from the 1m data) |

### 3. Closed-Candle Rule (No Repainting)

A common failure of signal tools is **repainting**: a signal appears mid-candle, then vanishes when the candle closes
differently. pooyer avoids this by design:

- Only candles whose 1-minute window has **fully elapsed** (`openTime + 60s <= now`) are passed to the signal engine.
- The still-forming candle is drawn on the **chart** as the last point so the display feels live, but it is never used
  for signal generation, the checklist, ATR, or alert triggers.
- Consequently, a signal fires **at the close of a candle** and uses that close as its entry price.

### 4. The Seven-Point Confluence Checklist

Every closed candle is scored for both LONG and SHORT. Each condition carries a weight (total = 100):

| # | Condition (LONG shown; SHORT is mirrored) | Weight |
| - | --- | -: |
| 1 | EMA 9 > EMA 21 > EMA 50 stack | 18 |
| 2 | RSI(14) between 52 and 68 (momentum band) | 14 |
| 3 | MACD histogram positive **and** expanding | 16 |
| 4 | Price above session VWAP | 15 |
| 5 | Bollinger %B between 0.55 and 0.90 | 10 |
| 6 | Volume ≥ 1.4× the 20-bar average | 14 |
| 7 | 5m **and** 15m EMA bias both bullish | 13 |

For SHORT: EMA stack reversed, RSI 32–48, MACD histogram negative and falling, price below VWAP, %B 0.10–0.45, volume
≥ 1.4×, and 5m + 15m bias both bearish. The side with the higher score becomes the current **bias**; the checklist panel
displays that side's pass/fail results and the actual values behind each check.

### 5. Signal Modules

Four independent modules evaluate every closed candle. Each can propose a LONG or SHORT **candidate**:

| Module | Idea | Trigger (LONG; SHORT is mirrored) |
| --- | --- | --- |
| **Confluence** | Many indicators agree | ≥ 5 of 7 checks pass **and** weighted score ≥ 60 |
| **Pullback** | Buy dips in an established trend | EMA 9 > 21 > 50; prior bar's low touched EMA 21 (within 0.15 ATR); current bar closes back above EMA 21, is bullish, RSI > 45 |
| **Breakout** | Momentum through a 20-bar range | Close above the prior 20-bar high, volume ≥ 1.5× average, MACD histogram > 0 |
| **Mean Reversion** | Fade stretched extremes | %B < 0.05, RSI < 30, and a bullish reversal candle |

If multiple candidates pass the minimum confidence, the **highest-confidence** one is chosen. A **cooldown of 3 bars**
prevents signals from firing back-to-back.

### 6. Confidence, Levels and Trade Management

**Confidence** is a heuristic 0–100 score (capped per module, for example 98 for Confluence and 95 for Pullback). It
combines weighted check scores, higher-timeframe alignment, volume strength, and MACD momentum. It is a **relative
ranking heuristic, not a statistical probability of winning**. The Backtest page includes a *Calibration* chart so you
can compare stated confidence against realised win rate.

**Levels** (defaults, all configurable in the backtester):

| Level | Calculation |
| --- | --- |
| Entry | Close of the signal candle |
| Stop-loss | Entry ∓ **1.0 × ATR(14)** (minimum 1.0 price unit) |
| TP1 | Entry ± **1.0R** |
| TP2 | Entry ± **2.0R** |

**Trade simulation rules** (used for session stats, signal outcomes and the backtester):

- **Partial exit:** 50% closes at TP1, the remaining 50% at TP2.
- **Break-even stop:** after TP1 is hit, the stop moves to entry.
- **Conservative tie-break:** if the stop and a target are touched within the same candle, the **stop is assumed to hit
  first**.
- **Time limit:** a trade is evaluated for up to **30 bars**; if neither stop nor TP2 is hit, it is marked **Expired**
  and settled at the last close.
- **Outcomes:** `Active`, `TP1 Hit`, `TP2 Hit`, `SL Hit`, `Expired`.

| Outcome | Result (R, before costs) |
| --- | --- |
| SL Hit | −1.0 |
| TP1 Hit, then stopped at break-even | +0.5 |
| TP2 Hit | +1.5 (0.5 × 1R + 0.5 × 2R) |
| Expired | Open P/L at the last close, in R |

### 7. Signal Lifecycle

```
 candle closes ─► engine evaluates ─► candidate ≥ min confidence?
                                            │ yes
                                            ▼
                       SIGNAL FIRED (entry = close, SL, TP1, TP2)
                                            │
              valid for 120 s ─► countdown on the Hero card
                                            │
         price tracked on later closed candles until resolved
                                            ▼
              TP1 / TP2 / SL / Expired  ─►  logged in Signal Feed + Session Stats
```

- The **Hero card** shows the active signal (side, confidence ring, entry, SL, TP1/TP2, countdown, invalidation level).
- When no signal is active it shows a *hunting* state with the current bias and how many checklist items pass.
- A signal is considered **actionable for 120 seconds** after it fires. Beyond that window, entry is stale.

### 8. Alerts

Configured in the **Alerts** panel on the dashboard:

- **Sound:** a WebAudio beep (different tone for LONG vs SHORT) with a volume slider. Browsers require a user
  interaction before audio can play, so click anywhere or use **Test alert** once.
- **Toasts:** on-screen notifications with the signal details.
- **Filters:** minimum confidence, and toggles for LONG and/or SHORT signals.
- **Test buttons:** verify sound and toast on your device before relying on them.

Alert safety guarantees:

- Signals already present when the page loads are **primed** and never trigger an alert (only new signals do).
- Every signal ID is tracked, so a signal alerts **once**.
- Alerts and signals **pause** while the feed is not live, to avoid acting on stale data.

> Alert settings are held in memory for the session and reset on page reload.

### 9. Feed Health and Reconnection

| Status | Meaning |
| --- | --- |
| `connecting` | Initial load / socket opening |
| `live` | Receiving data normally. Signals and alerts are active |
| `reconnecting` | Socket dropped; retrying with backoff |
| `stale` | No messages received for a while; the watchdog forces a reconnect |
| `error` | Could not load market data (for example, the network or Binance is blocked) |

After a reconnect, the app **backfills any missed candles** over REST so indicators stay continuous. The status is shown
in the sidebar and as a warning banner on the dashboard.

---

## 🖥️ Using the App

### Live Signals Dashboard

Route: `/` (alias: `/live-signal-dashboard`)

1. **Live tick strip:** BTC price, bid/ask spread, 24h change, high/low, and last-tick age.
2. **Hero signal card:** the current actionable signal or the hunting state.
3. **Confluence checklist:** live pass/fail for each of the 7 conditions.
4. **Module status grid:** status of Confluence, Pullback, Breakout and Mean Reversion.
5. **Price chart:** last 60 candles, overlays, and BUY/SELL markers.
6. **Alert control panel:** sound, volume, toasts, filters, and test buttons.
7. **Session stats strip:** signals today, wins/losses, net R, win rate, loss-streak guard.
8. **Signal feed table:** sortable and filterable history; **Export CSV** downloads the visible rows.

### Backtest and Performance

Route: `/backtest-strategy-performance`

1. Open the page; it fetches real historical 1m candles from Binance (cached per session).
2. Adjust parameters in the **Parameter panel** (below) and run the backtest.
3. Review the output:
   - **KPI grid:** win rate, profit factor, expectancy, max drawdown, total trades, trades/day, average R:R, Sharpe, average hold time.
   - **Equity curve:** compounding `riskPct` per 1R, starting at 100.
   - **Module comparison:** win rate and profit factor per module.
   - **Hourly win rate** and **session** (Asia / London / New York) breakdown.
   - **R-distribution**, **confidence calibration**, **monthly returns**, **streak stats**, and **weekly** best/worst.
   - **Trades table:** every simulated trade, with **Export CSV**.

**Backtest parameters**

| Parameter | Default | Description |
| --- | -: | --- |
| `minConfidence` | 70 | Minimum confidence to take a signal |
| `slAtr` | 1.0 | Stop distance in ATR multiples |
| `tp1R` / `tp2R` | 1.0 / 2.0 | Take-profit distances in R |
| `spread` | 2.5 | Spread cost in price units |
| `slippage` | 0.8 | Slippage per side in price units |
| `riskPct` | 1 | Percent of equity risked per 1R |
| `maxTradesPerDay` | 20 | Daily trade cap |
| `htfFilter` | on | Require 5m/15m higher-timeframe alignment |
| `newsBlackout` | off | Skip news-window trades |

**Cost model:** total cost per trade = `spread + 2 × slippage` (price units), converted to R using that trade's stop
distance and subtracted from the result.

---

## ⚙️ Configuration

pooyer needs **no environment variables** to run; Binance public endpoints require no key.

The repository's `.env` may contain placeholder keys from the project template (Supabase, OpenAI, Stripe, etc.).
**None of them are used by the signal engine.** Leave them as placeholders and never commit real secrets.

Optional:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL used for SEO metadata, sitemap and Open Graph tags |

To change the instrument or timeframe, edit the constants in `src/lib/useLiveMarket.ts` (`REST`, `WS_URL`, and the
`symbol` / `interval` query parameters). Signal rules and defaults live in `src/lib/signalEngine.ts`
(`DEFAULT_ENGINE`) and `src/lib/backtestEngine.ts` (`DEFAULT_PARAMS`).

---

## 📁 Project Structure

```
pooyer/
├── public/
│   ├── assets/images/            # Logo and fallback images
│   ├── robots.txt
│   └── sitemap.xml
├── src/
│   ├── app/
│   │   ├── layout.tsx            # Root layout, metadata, JSON-LD
│   │   ├── page.tsx              # Live dashboard (/)
│   │   ├── not-found.tsx
│   │   ├── components/           # Dashboard components
│   │   │   ├── LiveSignalDashboard.tsx   # Orchestrates feed, analysis, alerts
│   │   │   ├── HeroSignalCard.tsx
│   │   │   ├── ConfluenceChecklist.tsx
│   │   │   ├── ModuleStatusGrid.tsx
│   │   │   ├── PriceChartPanel.tsx / PriceChartClient.tsx
│   │   │   ├── AlertControlPanel.tsx
│   │   │   ├── SessionStatsStrip.tsx
│   │   │   ├── LiveTickStrip.tsx
│   │   │   └── SignalFeedTable.tsx
│   │   ├── live-signal-dashboard/        # Alias route for the dashboard
│   │   └── backtest-strategy-performance/
│   │       ├── page.tsx
│   │       └── components/               # KPIs, charts, panels, trades table
│   ├── components/
│   │   ├── AppLayout.tsx · Sidebar.tsx · Topbar.tsx
│   │   └── ui/                           # Card, Badge, Modal, Toggle, Tooltip, Toaster...
│   ├── lib/
│   │   ├── useLiveMarket.ts      # REST seed + WebSocket + watchdog + backfill
│   │   ├── liveAnalysis.ts       # Closed-candle analysis, active signal, session stats
│   │   ├── signalEngine.ts       # Checklist, 4 modules, levels, trade resolution
│   │   ├── backtestEngine.ts     # Historical simulation and metrics
│   │   ├── indicators.ts         # EMA, RSI, MACD, ATR, VWAP, Bollinger, HTF bias
│   │   ├── types.ts · format.ts · mockData.ts
│   └── styles/
│       ├── tailwind.css          # Theme tokens and utilities
│       └── index.css
├── next.config.mjs · tailwind.config.js · tsconfig.json · package.json
```

---

## 📜 Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Development server on port **4028** |
| `npm run build` | Production build |
| `npm run serve` | Run the production build (`next start`) |
| `npm run start` | Alias for the dev server on port 4028 |
| `npm run lint` / `lint:fix` | ESLint check / auto-fix |
| `npm run type-check` | TypeScript check (`tsc --noEmit`) |
| `npm run format` | Prettier formatting |

---

## ☁️ Deployment

pooyer is a standard Next.js app with no server-side secrets, so it deploys to any Next.js-capable host
(Vercel, Netlify via `@netlify/plugin-nextjs`, a Node server, or a container).

```bash
npm run build
npm run serve   # listens on PORT (default 3000) when run with `next start`
```

Checklist:

- Set `NEXT_PUBLIC_SITE_URL` to your production URL (SEO, sitemap, canonical).
- Update the URLs in `public/sitemap.xml` and `public/robots.txt` to your domain.
- Make sure end users' networks can reach `api.binance.com` and `stream.binance.com:9443`.
- Binance may restrict access from some regions. Because requests are made from the **user's browser**, availability
  depends on the user's location, not your server's.

---

## ♿ Accessibility and SEO

- Skip-to-content link, visible keyboard focus, `aria-current` navigation, `aria-sort` on tables, captions, and
  `aria-pressed` on filter toggles.
- `role="alert"` / `role="status"` on feed warnings; charts include text alternatives.
- Modal focus management and `Escape` to close the mobile drawer.
- `prefers-reduced-motion` support for animated backgrounds.
- Title template, Open Graph and Twitter tags, canonical URL, JSON-LD, `robots.txt` and `sitemap.xml`.

> The accessibility review was performed by code inspection. Run an automated audit (axe / Lighthouse) and verify with
> assistive technology before relying on it for compliance.

---

## 🚧 Known Limitations

Please read these before relying on the output:

- **Signals are unproven live.** The engine has been verified against real Binance data for correct data flow and the
  closed-candle split, but its profitability has **not** been validated in live trading.
- **Backtests are simplified.** Costs are fixed (spread and slippage constants), fills are assumed at the close of the
  signal candle, and there is no order-book depth, latency, funding, or liquidity modelling. Real results will differ.
- **Single instrument and timeframe:** BTCUSDT on 1-minute candles only. Binance spot **BTCUSDT** is used as a proxy for
  BTC/USD.
- **Browser-dependent:** analysis runs only while the page is open. There are no background or push notifications.
- **Alert settings are not persisted** across reloads.
- **Entry slippage:** the entry is the candle close; by the time you act (up to 120 s later), price may have moved.
- **Confidence is a heuristic**, not a probability.
- **Regional access:** Binance endpoints may be blocked in some regions.

---

## 🩺 Troubleshooting

| Symptom | Likely cause and fix |
| --- | --- |
| Status stuck on **Connecting** or shows **Offline** | Binance is unreachable (network, VPN, firewall, or regional block). Check that `api.binance.com` and `stream.binance.com:9443` are reachable from your browser |
| **Feed stale** banner | No data received recently. The app reconnects and backfills automatically; signals are paused until the feed is live again |
| No sound on alerts | Browsers block audio until a user gesture. Click the page or press **Test alert**; also check the volume slider and system mute |
| No signals for a long time | Normal. Signals require several conditions to align and meet the minimum confidence. Try lowering the confidence in the Alerts panel (display filter) |
| Port already in use | Change the port in the `dev` script in `package.json` (`next dev -p 4028`) |
| Backtest loads slowly | Many 1000-candle REST requests are made sequentially; reduce the number of bars |

---

## 🤝 Contributing

Contributions are welcome.

1. Fork the repository and create a feature branch: `git checkout -b feat/my-change`
2. Make your changes, then run `npm run lint` and `npm run type-check`
3. Verify `npm run build` passes
4. Open a Pull Request describing the change and, for signal-logic changes, include before/after backtest results

**Guidelines:** keep signal logic free of look-ahead (only use data up to and including the evaluated closed candle),
avoid computing from the forming candle, and keep new components typed and accessible.

---

## 📄 License

Released under the **MIT License**. Add a `LICENSE` file to the repository root if one is not present.

---

<div align="center">

**Trade responsibly. Past performance, simulated or real, does not guarantee future results.**

</div>