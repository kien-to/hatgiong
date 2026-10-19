# Hạt Giống — Đầu tư thử, học thật

A Vietnamese-first paper-trading web app for beginners. You practice with 100,000,000 ₫ of virtual money on every stock and ETF listed on HOSE, HNX and UPCoM, at real market prices. An AI tutor (Mầm) explains each concept at the moment you run into it.

## Run locally

Prerequisites: Node 20+, Python 3.10+, Docker, Supabase CLI.

```bash
# 1. Database + auth (Postgres, GoTrue, local mailbox at http://127.0.0.1:54324)
supabase gen signing-key --algorithm ES256 --append   # once; writes supabase/signing_keys.json (needs a file containing [] first)
supabase start                                        # applies supabase/migrations

# 2. Backend (market data, orders, AI tutor)
python3 -m venv server/.venv
server/.venv/bin/pip install -r server/requirements.txt
cp server/.env.example server/.env                    # add ANTHROPIC_API_KEY for the real tutor
npm run server                                        # http://127.0.0.1:8000

# 3. Frontend
cp .env.example .env.local
npm install
npm run dev                                           # http://localhost:5173, proxies /api to the backend
```

Tests: `npm test` for the TypeScript engine and the rule-based tutor, and `cd server && .venv/bin/python -m pytest` for the Python engine.

`VITE_DATA=mock npm run dev` runs a fully offline demo: simulated prices, a browser-only account and the rule-based tutor. No backend is needed.

## Architecture

```
src/                      React + Vite + Tailwind + zustand
  domain/                 Pure TS: VN market rules, trading engine (used for order previews)
  services/               Interfaces + implementations
    http/                 Live market data and the Claude tutor via the backend
    account/http.ts       Server-backed account (Supabase session → FastAPI)
    account/local.ts      Browser-only account for offline mode
    mock/                 Simulator and rule-based tutor (fallbacks)
  store/                  auth (Supabase), user (account state), catalog, market, ui
server/app/               FastAPI
  vietcap.py              Listing, price board, OHLC bars (cached)
  engine.py               Authoritative order validation and fill math (mirrors src/domain)
  db.py                   Postgres access; order execution runs in transactions
  matcher.py              Background task that fills resting limit orders every 5 s
  auth.py                 Supabase JWT verification (JWKS; falls back to /auth/v1/user for HS256)
  tutor.py                Claude streaming tutor
supabase/migrations/      Schema, RLS, and a signup trigger that creates each user's profile and portfolio
```

### Accounts

- Every visitor is signed in as a Supabase **anonymous (guest)** user automatically.
- A guest can upgrade with **email** (verification email, then set a password) or **Google** (`linkIdentity`). The user id stays the same, so all progress is kept.
- Existing users sign in with email/password or Google.
- Clients can only **read** their own rows (RLS). Cash, positions and orders are written only by the backend, which executes orders against live quotes, so users can't edit their balance.
- Every quiz attempt is stored, not just the best score, so learning can be measured over time.

### Market data

Prices come from Vietcap's public web endpoints (`trading.vietcap.com.vn`): the listing of 1,540 stocks and ETFs, the price board, and daily and minute bars. These aren't a documented API, so the backend caches everything and the frontend falls back to the simulator if they fail. For production, use a licensed feed such as SSI FastConnect.

Fundamentals (P/E, dividend yield, descriptions) exist only for the 27 curated stocks in `src/content/stocks.ts` and are labelled "ước tính" (estimate).

### AI tutor

`server/app/tutor.py` streams from Claude (`claude-opus-5-5`, low effort) with server-side refusal fallbacks enabled. The system prompt sets the teaching style and the VN market rules, and forbids buy/sell recommendations. Each request carries the user's live context: page, stock, cash, positions, sector weights. Only signed-in sessions (guests included) can call it.

## Deploying to a hosted Supabase project

1. Create a project and run `supabase link --project-ref <ref>`, then `supabase db push`.
2. In Authentication → Providers, enable **Anonymous sign-ins** and **Manual linking**. Turn on CAPTCHA (Turnstile) for anonymous sign-ins; the default limit is 30 per hour per IP.
3. Google: create a Google Cloud OAuth "Web application" client. Add your site to the authorised JavaScript origins and `https://<ref>.supabase.co/auth/v1/callback` as the redirect URI. Paste the client ID and secret into the Google provider. For local Google login, set `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` and `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET` before `supabase start`, and use `http://127.0.0.1:54321/auth/v1/callback` as the redirect URI.
4. Add your site URL to Authentication → URL Configuration (site URL and redirect allow list).
5. Backend env: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `DATABASE_URL` (Project Settings → Database, a session-mode pooler URL), `ANTHROPIC_API_KEY`, `CORS_ORIGINS` if the frontend is on another origin.
6. Frontend env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.

## Known limitations

- Orders fill against the last traded price, not the order book. Resting limit orders fill at their limit price once the market crosses it. Outside trading hours prices don't move.
- T+2 settlement, ATO/ATC sessions, trading hours and corporate actions (dividends, splits) aren't simulated.
- The browser polls the whole price board (~1,540 quotes) every 10 s; switch to a WebSocket with diffs before scaling.
- Signing into an existing account from a guest session doesn't merge the guest's progress.
- Anonymous users are never cleaned up; schedule `delete from auth.users where is_anonymous and created_at < now() - interval '30 days'`.
- There's no rate limiting on `/api/tutor` beyond requiring a session; add per-user limits before going public.
- Vietnamese only, light mode only.
