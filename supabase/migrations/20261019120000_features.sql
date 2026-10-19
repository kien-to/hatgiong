-- Learning, realism, safety and classroom features.

-- Trade reflections: the user's own reason for each order.
alter table public.orders add column note text check (char_length(note) <= 500);

-- Vietnamese LO orders are day orders: unfilled ones expire at the close.
alter table public.orders drop constraint orders_status_check;
alter table public.orders add constraint orders_status_check check (status in ('pending', 'filled', 'cancelled', 'expired'));

-- Tutor usage, for per-user rate limits and cost tracking.
create table public.tutor_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  created_at timestamptz not null default now()
);
create index tutor_events_user_idx on public.tutor_events (user_id, created_at);
alter table public.tutor_events enable row level security;
create policy "own tutor events" on public.tutor_events for select to authenticated using ((select auth.uid()) = user_id);

-- Corporate actions (dividends). Entitlement is recorded on the ex-date from current holdings;
-- cash or shares are credited on the payment date.
create table public.corporate_actions (
  id bigint generated always as identity primary key,
  symbol text not null,
  kind text not null check (kind in ('cash_dividend', 'stock_dividend')),
  ex_date date not null,
  pay_date date not null,
  cash_per_share numeric(20, 4),
  ratio numeric(20, 6),
  note text,
  created_at timestamptz not null default now(),
  unique (symbol, kind, ex_date),
  check (pay_date >= ex_date),
  check ((kind = 'cash_dividend' and cash_per_share > 0) or (kind = 'stock_dividend' and ratio > 0))
);
alter table public.corporate_actions enable row level security;
create policy "corporate actions are public" on public.corporate_actions for select to anon, authenticated using (true);

create table public.dividend_payouts (
  action_id bigint not null references public.corporate_actions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  qty integer not null,
  cash bigint not null default 0,
  tax bigint not null default 0,
  shares integer not null default 0,
  entitled_at timestamptz not null default now(),
  paid_at timestamptz,
  primary key (action_id, user_id)
);
alter table public.dividend_payouts enable row level security;
create policy "own payouts" on public.dividend_payouts for select to authenticated using ((select auth.uid()) = user_id);

-- Classes: a teacher shares a join code; students who join consent to the teacher seeing their
-- display name, learning progress and virtual-portfolio results.
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  join_code text not null unique,
  created_at timestamptz not null default now()
);
create table public.class_members (
  class_id uuid not null references public.classes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (class_id, user_id)
);
create index class_members_user_idx on public.class_members (user_id);
alter table public.classes enable row level security;
alter table public.class_members enable row level security;
create policy "own classes" on public.classes for select to authenticated using ((select auth.uid()) = owner_id);
create policy "own memberships" on public.class_members for select to authenticated using ((select auth.uid()) = user_id);

-- Delete guest accounts that have been inactive for 30 days (02:00 Vietnam time).
create extension if not exists pg_cron;
select cron.schedule(
  'hatgiong-cleanup-guests',
  '0 19 * * *',
  $$delete from auth.users where is_anonymous and coalesce(last_sign_in_at, created_at) < now() - interval '30 days'$$
);
