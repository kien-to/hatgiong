# Usage analytics

The app records which pages and features people use in `public.usage_events`, in our own Supabase database. There is no third-party analytics tool.

- The browser sends events in batches (`src/lib/track.ts`) every few seconds and when the tab is hidden or closed.
- Clients can insert events but never read them. The database sets `user_id`, `guest` and `created_at` from the session, so a client cannot fake them.
- `user_id` has no foreign key. When an account is deleted, including the 30-day guest cleanup, its events stay as anonymous counts. Otherwise retention would only count the people who stayed.
- Events older than 13 months are deleted every night.

## Reading the numbers

Open the SQL editor in the Supabase dashboard and query the `analytics` views. Days and weeks use Vietnam time.

```sql
select * from analytics.daily_active order by day desc limit 30;        -- users, members, guests, sessions, page views
select * from analytics.feature_usage where day > current_date - 7 order by events desc;
select path, sum(views) as views, sum(users) as users from analytics.page_usage
  where day > current_date - 7 group by 1 order by 2 desc;               -- users is summed per day, so it can count one person more than once
select * from analytics.weekly_retention order by cohort desc, weeks_later;
select * from analytics.funnel order by cohort desc;                     -- per weekly cohort: visitors → onboarded → traded/quizzed/asked Mầm → signed up
```

A sign-up is a user who was first seen as a guest and later as a member. Everyone starts as a guest, so this also counts sign-ups that finish on a page reload, such as Google sign-in and the emailed link.

## Events

| Event | When | Props |
|---|---|---|
| `page_view` | Route change | — |
| `onboarding_completed` | Finished the intro | `level` |
| `order_placed` | Order accepted | `side`, `type`, `status` |
| `order_rejected` | Order refused | `topic` |
| `quiz_submitted` | Lesson quiz submitted | `lesson`, `score`, `total` |
| `tutor_opened` | Mầm panel opened | — |
| `tutor_question` | Question sent to Mầm | — |
| `calculator_used` | First slider move on the compound calculator | — |
| `search_used` | Picked a stock from search | `symbol` |
| `auth_dialog_opened` | Sign-up or sign-in dialog opened | `mode` |
| `signup_code_sent` | Confirmation code emailed | — |
| `class_joined`, `class_created` | Classes | — |

To add one, call `track('event_name', { ...props })`. Names are lowercase snake_case, 2 to 40 characters. Never put text the user typed into props.
