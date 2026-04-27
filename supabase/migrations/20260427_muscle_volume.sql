-- ── Per-muscle volume aggregation RPC ───────────────────────────────────
-- Returns total set volume (weight × reps, kg) per muscle group over the
-- last `lookback_days` for the authenticated user. Powers the Stats
-- screen's BodyMap (heatmap) and per-muscle KPI strip without needing the
-- client to download every workout_set row.
--
-- A workout_set "counts" iff:
--   1. Its parent workout has finished_at not null
--   2. weight and reps are both not null/0 (warmups with no load skipped)
--
-- The exercises.muscle_group column is the primary key — exercises with
-- multiple muscle_groups[] are flattened so each tag accrues full volume
-- (matches the dashboard's existing accumulation behaviour).
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.get_muscle_volume(lookback_days int default 30)
returns table (
  muscle text,
  volume numeric,
  set_count int
)
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cutoff timestamptz := now() - make_interval(days => greatest(lookback_days, 1));
begin
  if uid is null then
    return;
  end if;

  return query
  with set_rows as (
    select
      coalesce(
        nullif(lower(e.muscle_group), ''),
        'unknown'
      ) as muscle,
      coalesce(ws.weight, 0) * coalesce(ws.reps, 0) as load
    from public.workout_sets ws
    join public.workout_exercises we on we.id = ws.workout_exercise_id
    join public.workouts w on w.id = we.workout_id
    join public.exercises e on e.id = we.exercise_id
    where w.user_id = uid
      and w.finished_at is not null
      and w.started_at >= cutoff
      and coalesce(ws.weight, 0) > 0
      and coalesce(ws.reps, 0) > 0
  ),
  -- Flatten the optional muscle_groups[] array onto the same shape so an
  -- exercise tagged "Chest" + "Triceps" contributes to both heatmap cells.
  array_rows as (
    select
      lower(unnested) as muscle,
      coalesce(ws.weight, 0) * coalesce(ws.reps, 0) as load
    from public.workout_sets ws
    join public.workout_exercises we on we.id = ws.workout_exercise_id
    join public.workouts w on w.id = we.workout_id
    join public.exercises e on e.id = we.exercise_id
    cross join lateral unnest(coalesce(e.muscle_groups, '{}'::text[])) as unnested
    where w.user_id = uid
      and w.finished_at is not null
      and w.started_at >= cutoff
      and coalesce(ws.weight, 0) > 0
      and coalesce(ws.reps, 0) > 0
      and coalesce(array_length(e.muscle_groups, 1), 0) > 0
  ),
  unioned as (
    select * from set_rows
    union all
    select * from array_rows
  )
  select
    muscle,
    sum(load)::numeric as volume,
    count(*)::int as set_count
  from unioned
  group by muscle
  order by volume desc;
end;
$$;

revoke all on function public.get_muscle_volume(int) from public;
grant execute on function public.get_muscle_volume(int) to authenticated;
