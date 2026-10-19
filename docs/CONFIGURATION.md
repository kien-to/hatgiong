# Configuration: which key goes where

There are three env files and none of them is committed. Each one has an `.example` next to it to copy from.

| File | Read by | Needed for |
| --- | --- | --- |
| `server/.env` | FastAPI backend | Claude key, database, Supabase URL |
| `.env.local` | Vite frontend (baked into the browser bundle, so **only public values**) | Supabase URL + publishable key, Turnstile site key |
| `supabase/.env` | Supabase CLI, local stack only | Google OAuth client, CAPTCHA secret |

## 1. Anthropic API key (real AI tutor)

1. Go to https://console.anthropic.com → **API Keys** → *Create key*.
2. Put it in **`server/.env`**: `ANTHROPIC_API_KEY=sk-ant-...`
3. Restart the backend (`npm run server`).

Never put this key in `.env.local`. Anything with the `VITE_` prefix is shipped to every visitor's browser.

## 2. Supabase keys

**Local development** works out of the box. `supabase start` prints the values, and the examples already contain the local defaults:

- `.env.local`: `VITE_SUPABASE_URL=http://127.0.0.1:54321`, `VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...`
- `server/.env`: the same URL and publishable key, plus `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres`

**Hosted project** (https://supabase.com/dashboard):

| Value | Where to find it | Put it in |
| --- | --- | --- |
| Project URL `https://<ref>.supabase.co` | Project Settings → Data API | `VITE_SUPABASE_URL` and `SUPABASE_URL` |
| Publishable key `sb_publishable_...` | Project Settings → API Keys | `VITE_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_PUBLISHABLE_KEY` |
| Postgres connection string | Connect → Session pooler (port 5432) | `DATABASE_URL` in `server/.env`, with your DB password filled in |

The backend never needs the **secret** key (`sb_secret_...`). It talks to Postgres directly and verifies user tokens with the project's public JWKS.

## 3. Google sign-in

1. In https://console.cloud.google.com → *APIs & Services* → *Credentials*, create an **OAuth client ID**, type **Web application**.
   - Authorised JavaScript origins: `http://localhost:5180`, `http://localhost:5173`, and your production site URL.
   - Authorised redirect URIs: `http://127.0.0.1:54321/auth/v1/callback` (local) and `https://<ref>.supabase.co/auth/v1/callback` (hosted).
   - On the consent screen, add the scopes `openid`, `.../auth/userinfo.email` and `.../auth/userinfo.profile`.
2. **Local:** copy `supabase/.env.example` to `supabase/.env` and set `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` and `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`. Then run `supabase stop && supabase start`. If the Google button still says it isn't enabled, `export` the two variables in the same terminal before `supabase start`.
3. **Hosted:** Supabase dashboard → Authentication → Sign In / Providers → **Google**. Paste the client ID and secret, and enable it. Also turn on **Allow manual linking**, which lets a guest attach Google to their account.

The Google client ID isn't secret, but the client secret is, so it only goes into `supabase/.env` or the Supabase dashboard.

## 4. CAPTCHA (Cloudflare Turnstile), optional but recommended before launch

1. Go to https://dash.cloudflare.com → Turnstile → *Add widget*, and get a **site key** and a **secret key**.
2. Put the site key in `.env.local`: `VITE_TURNSTILE_SITE_KEY=...`
3. Put the secret where Supabase Auth checks it:
   - **Local:** set `SUPABASE_AUTH_CAPTCHA_SECRET` in `supabase/.env`, uncomment the `[auth.captcha]` block in `supabase/config.toml`, then restart Supabase.
   - **Hosted:** Authentication → Attack Protection → enable CAPTCHA, choose Turnstile, and paste the secret.

For testing, Cloudflare's always-pass pair is site key `1x00000000000000000000AA` and secret `1x0000000000000000000000000000000AA`. Set both sides or neither: a site key without the secret, or the reverse, makes sign-ins fail.

## 5. Other backend settings (`server/.env`)

- `CORS_ORIGINS=https://hatgiong.vn`: only needed when the site and API are on different origins.
- `MARKET_HOURS=always`: development only. Orders fill 24/7 and T+2 is skipped.

## 6. Dividend data

Load cash and stock dividend events from a CSV. The format is in `server/scripts/corporate_actions.template.csv`:

```bash
server/.venv/bin/python server/scripts/load_corporate_actions.py events.csv
```

The background job records entitlements on the ex-date (from positions held at that time) and credits cash (minus 5% tax) or shares on the payment date.
