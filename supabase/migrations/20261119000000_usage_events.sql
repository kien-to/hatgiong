-- Product usage: which pages and features people use, so we can tell whether anyone uses them.
-- Clients insert their own events and can never read them. user_id has no foreign key on purpose:
-- when an account is deleted (including the 30-day guest cleanup) its events stay as anonymous
-- counts, otherwise retention would only ever count the people who stayed.

create table public.usage_events (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  session_id uuid not null,
  name text not null check (name ~ '^[a-z][a-z0-9_]{1,39}$'),
  path text check (char_length(path) <= 200),
  props jsonb not null default '{}'::jsonb check (jsonb_typeof(props) = 'object' and pg_column_size(props) <= 2048),
  guest boolean not null default false,
  device text check (device in ('mobile', 'tablet', 'desktop')),
  created_at timestamptz not null default now()
);

create index usage_events_created_idx on public.usage_events (created_at);
create index usage_events_name_created_idx on public.usage_events (name, created_at);
create index usage_events_user_created_idx on public.usage_events (user_id, created_at);

-- The identity, guest flag and timestamp come from the request, never from the client payload.
create function public.stamp_usage_event() returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.user_id := auth.uid();
  new.guest := coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
  new.created_at := now();
  return new;
end;
$$;

create trigger stamp_usage_event
  before insert on public.usage_events
  for each row execute function public.stamp_usage_event();

alter table public.usage_events enable row level security;
create policy "insert own usage events" on public.usage_events for insert to authenticated with check (user_id = (select auth.uid()));
revoke all on public.usage_events from anon, authenticated;
grant insert (session_id, name, path, props, device) on public.usage_events to authenticated;

-- Keep 13 months: enough for year-over-year, not forever (03:30 Vietnam time).
select cron.schedule(
  'hatgiong-purge-usage-events',
  '30 20 * * *',
  $$delete from public.usage_events where created_at < now() - interval '13 months'$$
);

-- Reporting views for the SQL editor. The analytics schema is not exposed through the API.
create schema analytics;
revoke all on schema analytics from anon, authenticated;

create view analytics.daily_active as
select
  (created_at at time zone 'Asia/Ho_Chi_Minh')::date as day,
  count(distinct user_id) as users,
  count(distinct user_id) filter (where not guest) as members,
  count(distinct user_id) filter (where guest) as guests,
  count(distinct session_id) as sessions,
  count(*) filter (where name = 'page_view') as page_views
from public.usage_events
group by 1;

create view analytics.feature_usage as
select
  (created_at at time zone 'Asia/Ho_Chi_Minh')::date as day,
  name,
  count(*) as events,
  count(distinct user_id) as users
from public.usage_events
where name <> 'page_view'
group by 1, 2;

create view analytics.page_usage as
select
  (created_at at time zone 'Asia/Ho_Chi_Minh')::date as day,
  path,
  count(*) as views,
  count(distinct user_id) as users
from public.usage_events
where name = 'page_view'
group by 1, 2;

-- Of the people first seen in a week, how many came back N weeks later.
create view analytics.weekly_retention as
with firsts as (
  select user_id, date_trunc('week', min(created_at) at time zone 'Asia/Ho_Chi_Minh')::date as cohort
  from public.usage_events
  group by 1
),
activity as (
  select distinct user_id, date_trunc('week', created_at at time zone 'Asia/Ho_Chi_Minh')::date as week
  from public.usage_events
)
select
  f.cohort,
  ((a.week - f.cohort) / 7) as weeks_later,
  count(distinct a.user_id) as users,
  round(100.0 * count(distinct a.user_id) / max(c.size), 1) as pct
from firsts f
join activity a using (user_id)
join (select cohort, count(*) as size from firsts group by 1) c using (cohort)
group by 1, 2;

-- For each weekly cohort: how many reached each step of the core journey. Everyone starts as a
-- guest, so a sign-up is a user seen first as a guest and later as a member. That also covers
-- Google and the emailed link, which finish on a fresh page load.
create view analytics.funnel as
with firsts as (
  select user_id, date_trunc('week', min(created_at) at time zone 'Asia/Ho_Chi_Minh')::date as cohort
  from public.usage_events
  group by 1
),
reached as (
  select
    user_id,
    bool_or(name = 'onboarding_completed') as onboarded,
    bool_or(name = 'order_placed') as traded,
    bool_or(name = 'quiz_submitted') as quizzed,
    bool_or(name = 'tutor_question') as asked_tutor,
    bool_or(name = 'auth_dialog_opened') as opened_signup,
    bool_or(name = 'signup_code_sent') as sent_code,
    bool_or(guest) and bool_or(not guest) as signed_up
  from public.usage_events
  group by 1
)
select
  cohort,
  count(*) as visitors,
  count(*) filter (where onboarded) as onboarded,
  count(*) filter (where traded) as traded,
  count(*) filter (where quizzed) as quizzed,
  count(*) filter (where asked_tutor) as asked_tutor,
  count(*) filter (where opened_signup) as opened_signup,
  count(*) filter (where sent_code) as sent_code,
  count(*) filter (where signed_up) as signed_up
from firsts join reached using (user_id)
group by 1;
