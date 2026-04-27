-- ── User streak stats RPC ────────────────────────────────────────────────
-- Returns per-user cumulative streak data computed in SQL so the client
-- doesn't have to download the full workouts list to render the tier card.
--
-- Scoped to auth.uid() — caller never passes a user id, so this is safe to
-- expose to the `authenticated` role without extra row-level checks.
--
-- A workout "counts" iff it has both started_at and finished_at, matching
-- the existing client-side rule (computeDayStats() filters on finished
-- workouts before adding to the day-set).
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.get_user_streak_stats()
returns table (
  workout_days     int,
  current_streak   int,
  longest_streak   int
)
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    workout_days   := 0;
    current_streak := 0;
    longest_streak := 0;
    return next;
    return;
  end if;

  return query
  with day_set as (
    select distinct (started_at at time zone 'UTC')::date as d
    from public.workouts
    where user_id = uid
      and finished_at is not null
  ),
  ordered as (
    select d,
           row_number() over (order by d) as rn,
           d - (row_number() over (order by d))::int as grp
    from day_set
  ),
  runs as (
    select grp,
           min(d) as start_d,
           max(d) as end_d,
           count(*)::int as run_len
    from ordered
    group by grp
  )
  select
    coalesce((select count(*)::int from day_set), 0) as workout_days,
    coalesce(
      (
        select run_len
        from runs
        where end_d in (current_date, current_date - 1)
        order by end_d desc
        limit 1
      ),
      0
    ) as current_streak,
    coalesce((select max(run_len) from runs), 0) as longest_streak;
end;
$$;

-- Allow the authenticated role to call the RPC. anon stays blocked so
-- unauthenticated visitors can't probe it.
revoke all on function public.get_user_streak_stats() from public;
grant execute on function public.get_user_streak_stats() to authenticated;
