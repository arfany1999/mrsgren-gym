-- ── Share tokens for /share/[token] public workout cards ─────────────────
-- Tokens give an anonymous reader read-only access to a single workout's
-- summary (duration, total_volume, exercise count). The full workouts /
-- workout_sets tables remain locked behind the existing RLS — anon never
-- queries them directly; everything flows through get_share_summary().
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.share_tokens (
  token        text primary key,
  user_id      uuid not null references auth.users on delete cascade,
  workout_id   uuid not null references public.workouts on delete cascade,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz,
  revoked      boolean not null default false
);

create index if not exists share_tokens_user_idx on public.share_tokens(user_id);
create index if not exists share_tokens_workout_idx on public.share_tokens(workout_id);

alter table public.share_tokens enable row level security;

-- Owner can manage their own tokens.
drop policy if exists "share_tokens owner select" on public.share_tokens;
create policy "share_tokens owner select"
  on public.share_tokens for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "share_tokens owner insert" on public.share_tokens;
create policy "share_tokens owner insert"
  on public.share_tokens for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.workouts w
      where w.id = workout_id and w.user_id = auth.uid()
    )
  );

drop policy if exists "share_tokens owner update" on public.share_tokens;
create policy "share_tokens owner update"
  on public.share_tokens for update to authenticated
  using (auth.uid() = user_id);

drop policy if exists "share_tokens owner delete" on public.share_tokens;
create policy "share_tokens owner delete"
  on public.share_tokens for delete to authenticated
  using (auth.uid() = user_id);

-- ── get_share_summary(token) ─────────────────────────────────────────────
-- security definer so anon callers can read a single workout via a valid,
-- non-revoked, non-expired token without touching the workouts/* RLS.
-- The function never returns user_id or any other PII beyond the display
-- name passed to the share card.
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.get_share_summary(p_token text)
returns table (
  display_name      text,
  workout_title     text,
  started_at        timestamptz,
  duration_secs     int,
  total_volume      numeric,
  exercise_count    int,
  workout_days      int,
  current_streak    int
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  st  record;
begin
  select * into st
  from public.share_tokens
  where token = p_token
    and revoked = false
    and (expires_at is null or expires_at > now())
  limit 1;

  if not found then
    return;
  end if;

  return query
  with workout_row as (
    select
      coalesce(p.name, 'Athlete') as display_name,
      w.title as workout_title,
      w.started_at,
      coalesce(w.duration_secs, 0)::int as duration_secs,
      coalesce(w.total_volume, 0)::numeric as total_volume
    from public.workouts w
    left join public.profiles p on p.id = w.user_id
    where w.id = st.workout_id
      and w.user_id = st.user_id
      and w.finished_at is not null
  ),
  ex_count as (
    select count(*)::int as n
    from public.workout_exercises we
    where we.workout_id = st.workout_id
  ),
  day_set as (
    select distinct (started_at at time zone 'UTC')::date as d
    from public.workouts
    where user_id = st.user_id and finished_at is not null
  ),
  ordered as (
    select d,
           row_number() over (order by d) as rn,
           d - (row_number() over (order by d))::int as grp
    from day_set
  ),
  runs as (
    select grp, max(d) as end_d, count(*)::int as run_len
    from ordered group by grp
  )
  select
    wr.display_name,
    wr.workout_title,
    wr.started_at,
    wr.duration_secs,
    wr.total_volume,
    coalesce((select n from ex_count), 0)::int,
    coalesce((select count(*) from day_set), 0)::int,
    coalesce(
      (select run_len from runs where end_d in (current_date, current_date - 1) order by end_d desc limit 1),
      0
    )::int
  from workout_row wr;
end;
$$;

revoke all on function public.get_share_summary(text) from public;
grant execute on function public.get_share_summary(text) to anon, authenticated;
