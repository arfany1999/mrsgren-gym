-- Align the production schema with the columns the Next app reads/writes.
-- Safe to re-run: all column additions are guarded and data backfills are
-- idempotent.

-- Older production deployments used public.users for app profile data while
-- the starter schema used public.profiles. Keep both aligned so current code
-- and older installs can survive the transition.
do $$
begin
  if to_regclass('public.users') is not null then
    alter table public.users add column if not exists sex text;
    alter table public.users add column if not exists age int;
    alter table public.users add column if not exists weight_kg numeric;
    alter table public.users add column if not exists height_cm int;
    alter table public.users add column if not exists activity_level text;
    alter table public.users add column if not exists onboarding_done boolean not null default false;

    alter table public.users
      drop constraint if exists users_sex_check,
      add constraint users_sex_check check (sex is null or sex in ('male', 'female'));

    alter table public.users
      drop constraint if exists users_activity_level_check,
      add constraint users_activity_level_check check (
        activity_level is null
        or activity_level in ('sedentary', 'light', 'moderate', 'very_active')
      );
  end if;
end $$;

alter table public.profiles add column if not exists sex text;
alter table public.profiles add column if not exists age int;
alter table public.profiles add column if not exists weight_kg numeric;
alter table public.profiles add column if not exists height_cm int;
alter table public.profiles add column if not exists activity_level text;
alter table public.profiles add column if not exists onboarding_done boolean not null default false;

alter table public.profiles
  drop constraint if exists profiles_sex_check,
  add constraint profiles_sex_check check (sex is null or sex in ('male', 'female'));

alter table public.profiles
  drop constraint if exists profiles_activity_level_check,
  add constraint profiles_activity_level_check check (
    activity_level is null
    or activity_level in ('sedentary', 'light', 'moderate', 'very_active')
  );

-- The UI uses `name`; older starter schema used `title`.
alter table public.routines add column if not exists name text;
update public.routines set name = coalesce(name, title, 'Routine') where name is null;
alter table public.routines alter column name set default 'Routine';
alter table public.routines alter column name set not null;
update public.routines set title = coalesce(title, name, 'Routine') where title is null;
alter table public.routines alter column title set default 'Routine';

-- The app consistently reads/writes order_index now, but keeps fallback reads
-- for historical rows using "order".
alter table public.routine_exercises add column if not exists order_index int default 0;
update public.routine_exercises set order_index = coalesce(order_index, "order", 0);

alter table public.workout_exercises add column if not exists order_index int default 0;
update public.workout_exercises set order_index = coalesce(order_index, "order", 0);

-- Workout summaries power the dashboard, profile chart, and public share cards.
alter table public.workouts add column if not exists duration_secs int;
alter table public.workouts add column if not exists total_volume numeric;
