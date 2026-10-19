-- Company fundamentals: cached from Vietcap IQ on demand, or loaded from a licensed provider
-- (server/scripts/load_fundamentals.py). Rows from any other source take priority over the cache.
create table public.stock_fundamentals (
  symbol text primary key,
  pe numeric(12, 2),
  pb numeric(12, 2),
  eps numeric(20, 2),
  roe numeric(8, 2),
  roa numeric(8, 2),
  dividend_yield numeric(8, 2),
  dividend_year integer,
  nim numeric(8, 2),
  npl numeric(8, 2),
  period text,
  description text check (char_length(description) <= 1000),
  source text not null,
  as_of date not null,
  updated_at timestamptz not null default now()
);
alter table public.stock_fundamentals enable row level security;
create policy "fundamentals are public" on public.stock_fundamentals for select to anon, authenticated using (true);
