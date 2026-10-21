# Deploying Hạt Giống

Three pieces: Supabase (database and auth), the FastAPI backend (a container), and the static frontend. Fill in the keys as described in [CONFIGURATION.md](CONFIGURATION.md).

## Recommended setup

| Piece | Host | Address |
| --- | --- | --- |
| Database and auth | Supabase, region Southeast Asia (Singapore) | — |
| Backend | Fly.io, region `sin`, config in `server/fly.toml` | `api.<your-domain>` |
| Frontend | Cloudflare Workers (static assets), config in `wrangler.jsonc` | `<your-domain>` |
| Sign-up email | Resend, as custom SMTP in Supabase | `no-reply@<your-domain>` |

Supabase's built-in email sender allows only a few messages an hour, which is not enough for sign-ups; set up custom SMTP before inviting users.

Deploy the backend with `fly deploy --ha=false` from `server/`. Without `--ha=false`, Fly starts two machines, and two copies of the order matcher could fill the same order twice.

## 1. Supabase

```bash
supabase login
supabase link --project-ref <ref>
supabase db push            # applies supabase/migrations, including the pg_cron guest cleanup
```

Then, in the dashboard:

- **Authentication → Sign In / Providers:** enable *Anonymous sign-ins*, *Allow manual linking*, *Email* (keep *Confirm email* on), and *Google*.
- **Authentication → URL Configuration:** set the site URL to your production URL and add it to the redirect allow list.
- **Authentication → Attack Protection:** CAPTCHA (Turnstile).
- **Database → Extensions:** make sure `pg_cron` is enabled. The migration creates it, but some plans need it toggled on.
- **Authentication → JWT Keys:** new projects use asymmetric signing keys, which the backend verifies via JWKS. If your project is still on the legacy JWT secret, the backend falls back to asking the Auth server, which is slower. Use *Migrate JWT secret* to switch.

## 2. Backend

Any container host works (Render, Fly.io, Railway, Cloud Run, a VPS).

```bash
docker build -t hatgiong-api server/
docker run -p 8000:8000 --env-file server/.env hatgiong-api
```

Environment variables: `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `DATABASE_URL`, and `CORS_ORIGINS` (your site origin). Don't set `MARKET_HOURS` in production.

Run **one** instance: the limit-order matcher and the WebSocket broadcaster run inside the API process. To scale out, move `matcher.run` into its own worker first.

The host must support WebSockets on `/api/ws/board`. Most do; behind nginx, add the `Upgrade` and `Connection` headers.

Supabase's session pooler (port 5432) and a direct connection both work. The transaction pooler (port 6543) is supported as well; prepared statements are disabled automatically there.

## 3. Frontend

```bash
VITE_SUPABASE_URL=... VITE_SUPABASE_PUBLISHABLE_KEY=... VITE_API_URL=https://<your-api-host> VITE_TURNSTILE_SITE_KEY=... npm run build
```

Upload `dist/` to any static host. `wrangler.jsonc` (Cloudflare Workers) and `vercel.json` (Vercel) route every path to `index.html` so deep links work. On Cloudflare, connect the GitHub repo under Workers & Pages with build command `npm run build` and deploy command `npx wrangler deploy`.

The Supabase URL and publishable key for production live in `.env.production`, which Vite reads during `npm run build`. Both values are public.

The simplest setup is serving the frontend and the API from the same domain, with a reverse proxy sending `/api/*` (including WebSocket upgrades) to the backend. Then `VITE_API_URL` and `CORS_ORIGINS` can stay empty.

## Before real users

- Use a licensed market-data feed (for example SSI FastConnect) instead of Vietcap's public web endpoints, and check its terms of use.
- Add Vietnamese public holidays to `server/app/session.py`. Weekends are handled, holidays aren't.
- Write a privacy notice covering what's stored (email, display name, virtual trades, quiz answers, tutor usage) and that class teachers can see their students' progress. Check it against Vietnam's personal-data rules (Decree 13/2023).
- Watch Anthropic spend: `public.tutor_events` records the tokens used per question.
