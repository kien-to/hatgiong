-- Hạt Giống core schema.
-- Clients read their own rows through RLS. Trading state (portfolios, positions, orders,
-- equity_snapshots) is written only by the FastAPI backend, which connects as a privileged
-- role and executes orders against live quotes, so users can't edit their own cash.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 60),
  level text not null default 'newbie' check (level in ('newbie', 'some', 'experienced')),
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.portfolios (
  user_id uuid primary key references auth.users (id) on delete cascade,
  starting_cash bigint not null default 100000000,
  cash bigint not null default 100000000 check (cash >= 0),
  realized_pnl numeric(20, 2) not null default 0,
  reset_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.positions (
  user_id uuid not null references auth.users (id) on delete cascade,
  symbol text not null,
  qty integer not null check (qty > 0),
  avg_cost numeric(20, 4) not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, symbol)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  symbol text not null,
  side text not null check (side in ('buy', 'sell')),
  type text not null check (type in ('market', 'limit')),
  qty integer not null check (qty > 0),
  limit_price bigint,
  status text not null check (status in ('pending', 'filled', 'cancelled')),
  fill_price bigint,
  fee bigint not null default 0,
  tax bigint not null default 0,
  created_at timestamptz not null default now(),
  filled_at timestamptz,
  check (type = 'market' or limit_price is not null)
);

create index orders_user_created_idx on public.orders (user_id, created_at desc);
create index orders_pending_idx on public.orders (symbol) where status = 'pending';

create table public.equity_snapshots (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  value numeric(20, 2) not null,
  created_at timestamptz not null default now()
);

create index equity_snapshots_user_idx on public.equity_snapshots (user_id, created_at);

create table public.watchlist (
  user_id uuid not null references auth.users (id) on delete cascade,
  symbol text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, symbol)
);

-- Every attempt is kept, not just the best score, so learning over time can be measured.
create table public.quiz_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id text not null,
  score integer not null check (score >= 0),
  total integer not null check (total > 0 and score <= total),
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index quiz_attempts_user_idx on public.quiz_attempts (user_id, lesson_id, created_at);

alter table public.profiles enable row level security;
alter table public.portfolios enable row level security;
alter table public.positions enable row level security;
alter table public.orders enable row level security;
alter table public.equity_snapshots enable row level security;
alter table public.watchlist enable row level security;
alter table public.quiz_attempts enable row level security;

create policy "own profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "own portfolio" on public.portfolios for select to authenticated using ((select auth.uid()) = user_id);
create policy "own positions" on public.positions for select to authenticated using ((select auth.uid()) = user_id);
create policy "own orders" on public.orders for select to authenticated using ((select auth.uid()) = user_id);
create policy "own equity" on public.equity_snapshots for select to authenticated using ((select auth.uid()) = user_id);
create policy "own watchlist" on public.watchlist for select to authenticated using ((select auth.uid()) = user_id);
create policy "own quiz attempts" on public.quiz_attempts for select to authenticated using ((select auth.uid()) = user_id);

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  insert into public.portfolios (user_id) values (new.id);
  insert into public.equity_snapshots (user_id, value) values (new.id, 100000000);
  insert into public.watchlist (user_id, symbol)
    select new.id, s from unnest(array['VNM', 'FPT', 'VCB', 'HPG', 'MWG']) as s;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
