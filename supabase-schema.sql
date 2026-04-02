-- ============================================================
-- GYM TRACKER — Supabase Database Schema
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- 1. Profiles (extends Supabase Auth users)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  name text not null,
  username text unique not null,
  avatar_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 2. Exercises
create table exercises (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  muscle_groups text[] default '{}',
  equipment text,
  instructions text,
  video_url text,
  is_custom boolean default false,
  created_by_user_id uuid references auth.users on delete set null,
  created_at timestamptz default now() not null
);

-- 3. Routines
create table routines (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade,
  title text not null,
  description text,
  folder_id uuid,
  is_public boolean default false,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 4. Routine Exercises
create table routine_exercises (
  id uuid default gen_random_uuid() primary key,
  routine_id uuid references routines on delete cascade not null,
  exercise_id uuid references exercises on delete cascade not null,
  "order" int default 0,
  sets_config jsonb default '[]'
);

-- 5. Workouts
create table workouts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  routine_id uuid references routines on delete set null,
  title text not null default 'Workout',
  notes text,
  started_at timestamptz default now() not null,
  finished_at timestamptz,
  is_public boolean default false
);

-- 6. Workout Exercises
create table workout_exercises (
  id uuid default gen_random_uuid() primary key,
  workout_id uuid references workouts on delete cascade not null,
  exercise_id uuid references exercises on delete cascade not null,
  "order" int default 0,
  superset_id uuid
);

-- 7. Sets
create table sets (
  id uuid default gen_random_uuid() primary key,
  workout_exercise_id uuid references workout_exercises on delete cascade not null,
  reps int,
  weight_kg numeric,
  set_type text default 'normal',
  rpe numeric,
  created_at timestamptz default now() not null
);

-- ============================================================
-- Row Level Security (RLS) — so users can only see their own data
-- ============================================================

alter table profiles enable row level security;
alter table exercises enable row level security;
alter table routines enable row level security;
alter table routine_exercises enable row level security;
alter table workouts enable row level security;
alter table workout_exercises enable row level security;
alter table sets enable row level security;

-- Profiles: users can read/update their own profile
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

-- Exercises: anyone can read, users can insert custom exercises
create policy "Anyone can read exercises" on exercises for select using (true);
create policy "Users can create custom exercises" on exercises for insert with check (auth.uid() = created_by_user_id);

-- Routines: users see their own + public routines
create policy "Users can read own routines" on routines for select using (auth.uid() = user_id or is_public = true);
create policy "Users can create routines" on routines for insert with check (auth.uid() = user_id);
create policy "Users can update own routines" on routines for update using (auth.uid() = user_id);
create policy "Users can delete own routines" on routines for delete using (auth.uid() = user_id);

-- Routine Exercises: accessible if user owns the routine
create policy "Users can read routine exercises" on routine_exercises for select
  using (exists (select 1 from routines where routines.id = routine_exercises.routine_id and (routines.user_id = auth.uid() or routines.is_public = true)));
create policy "Users can manage routine exercises" on routine_exercises for insert
  with check (exists (select 1 from routines where routines.id = routine_exercises.routine_id and routines.user_id = auth.uid()));
create policy "Users can delete routine exercises" on routine_exercises for delete
  using (exists (select 1 from routines where routines.id = routine_exercises.routine_id and routines.user_id = auth.uid()));

-- Workouts: users can only access their own
create policy "Users can read own workouts" on workouts for select using (auth.uid() = user_id);
create policy "Users can create workouts" on workouts for insert with check (auth.uid() = user_id);
create policy "Users can update own workouts" on workouts for update using (auth.uid() = user_id);
create policy "Users can delete own workouts" on workouts for delete using (auth.uid() = user_id);

-- Workout Exercises: accessible if user owns the workout
create policy "Users can read workout exercises" on workout_exercises for select
  using (exists (select 1 from workouts where workouts.id = workout_exercises.workout_id and workouts.user_id = auth.uid()));
create policy "Users can manage workout exercises" on workout_exercises for insert
  with check (exists (select 1 from workouts where workouts.id = workout_exercises.workout_id and workouts.user_id = auth.uid()));
create policy "Users can delete workout exercises" on workout_exercises for delete
  using (exists (select 1 from workouts where workouts.id = workout_exercises.workout_id and workouts.user_id = auth.uid()));

-- Sets: accessible if user owns the parent workout
create policy "Users can read sets" on sets for select
  using (exists (
    select 1 from workout_exercises we
    join workouts w on w.id = we.workout_id
    where we.id = sets.workout_exercise_id and w.user_id = auth.uid()
  ));
create policy "Users can create sets" on sets for insert
  with check (exists (
    select 1 from workout_exercises we
    join workouts w on w.id = we.workout_id
    where we.id = sets.workout_exercise_id and w.user_id = auth.uid()
  ));
create policy "Users can delete sets" on sets for delete
  using (exists (
    select 1 from workout_exercises we
    join workouts w on w.id = we.workout_id
    where we.id = sets.workout_exercise_id and w.user_id = auth.uid()
  ));
