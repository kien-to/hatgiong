# Hạt Giống — Đầu tư thử, học thật

A Vietnamese-first paper-trading web app for beginners. You practice with 100,000,000 ₫ of virtual money on every stock and ETF listed on HOSE, HNX and UPCoM, at real market prices and under real market rules. An AI tutor (Mầm) explains each concept at the moment you run into it.

- **Configuration (which key goes in which file):** [docs/CONFIGURATION.md](docs/CONFIGURATION.md)
- **Deployment:** [docs/DEPLOY.md](docs/DEPLOY.md)

## Run locally

Prerequisites: Node 20+, Python 3.10+, Docker, Supabase CLI.

```bash
# 1. Database + auth (Postgres, Supabase Auth, local mailbox at http://127.0.0.1:54324)
echo "[]" > supabase/signing_keys.json
supabase gen signing-key --algorithm ES256 --append   # once
supabase start                                        # applies supabase/migrations

# 2. Backend (market data, order execution, AI tutor)
python3 -m venv server/.venv
server/.venv/bin/pip install -r server/requirements.txt
cp server/.env.example server/.env                    # add ANTHROPIC_API_KEY for the real tutor
npm run server                                        # http://127.0.0.1:8000

# 3. Frontend
cp .env.example .env.local
npm install
npm run dev                                           # http://localhost:5173, proxies /api (incl. WebSocket) to the backend
```

- **Tests:** `npm test` (engine, spaced repetition, rule-based tutor) and `cd server && .venv/bin/python -m pytest` (engine, trading calendar).
- **Trading outside Vietnamese hours during development:** `MARKET_HOURS=always npm run server`.
- **Fully offline demo** (simulated prices, browser-only account, rule-based tutor): `VITE_DATA=mock npm run dev`.

## Features

**Practice with virtual money**
- 1,540 stocks and ETFs at live prices, streamed over a WebSocket.
- Price board with exchange and sector filters; stock pages with line and candle charts.
- Limit (LO) and market (MP) orders, checked against real rules: price bands (±7/10/15%), HOSE tick sizes, 100-share lots, 0.15% fee, 0.1% sell tax.
- Trading hours (ATO, continuous, lunch, ATC). Market orders work only during continuous matching; LO orders are day orders that expire at 15:00.
- **T+2 settlement:** shares bought on day T can be sold from the afternoon of T+2.
- Cash and stock dividends: entitled on the ex-date, paid on the payment date, 5% tax. Events are loaded from CSV.

**Learn through decisions**
- Mầm (Claude) knows your page, stock, positions, sector weights and recent trades.
- "Ask Mầm" buttons on every rejected order, warning and stat.
- An optional "why are you placing this order?" note on each trade, which Mầm uses to help you review your trades.

**Prove learning**
- Six lessons with quizzes.
- Every attempt is stored, so first-try vs best score shows real learning gain.
- Spaced repetition review (Leitner boxes: 1/3/7/14/30 days).

**Reach people who need it**
- Classes: a teacher shares a 6-character code.
- The teacher dashboard shows each student's lessons, quiz gain, reviews, diversification, share of trades with a written reason, and return.

**Accounts**
- Automatic guest session; upgrade with email (verified) or Google without losing progress.
- Supabase Postgres with RLS. Cash and positions are written only by the backend.

**Safety**
- Tutor rate limits: 6 questions/minute; 20/day for guests, 100/day for members. Token usage is logged.
- Optional Turnstile CAPTCHA.
- Inactive guests are deleted after 30 days (pg_cron).

## Architecture

```
src/                      React + Vite + Tailwind + zustand
  domain/                 Pure TS: market rules, trading engine (previews), sessions, spaced repetition
  services/               Interfaces + implementations (http/, account/, mock/ fallbacks)
  store/                  auth (Supabase), user, catalog, market, tutor, ui
server/app/               FastAPI
  vietcap.py              Listing, price board, OHLC bars (cached)
  engine.py, session.py   Authoritative order rules; Vietnamese trading calendar and T+2
  db.py                   Postgres access; transactional order execution, dividends, classes
  matcher.py              Background task: fills resting LO orders, expires day orders, processes dividends
  hub.py                  WebSocket fan-out of price-board diffs
  auth.py                 Supabase JWT verification (JWKS, with an /auth/v1/user fallback for HS256)
  tutor.py                Claude streaming tutor (claude-opus-5-5) with server-side refusal fallbacks
supabase/migrations/      Schema, RLS, signup trigger, pg_cron guest cleanup
```

## Known limitations

- Prices come from Vietcap's public web endpoints, which aren't a documented API. Use a licensed feed before launch.
- Orders fill against the last traded price, not the order book. There are no ATO/ATC order types.
- Vietnamese public holidays aren't in the trading calendar.
- Fundamentals (P/E, P/B, ROE, ROA, dividend yield, NIM/NPL for banks, company description) come from Vietcap IQ's public endpoints, fetched when a stock page is opened and cached for 24 hours. Analyst ratings and target prices in that feed are deliberately ignored. Rows loaded from a licensed CSV (`server/scripts/load_fundamentals.py`) take priority.
- There's no dividend-event feed yet, only the CSV loader (`server/scripts/load_corporate_actions.py`).
- Signing into an existing account from a guest session doesn't merge the guest's progress.
- Vietnamese only, light mode only.
