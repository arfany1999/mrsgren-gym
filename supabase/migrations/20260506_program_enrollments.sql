-- Program enrollments: track which template the user is currently following.
--
-- Progress (current day, weeks completed) is DERIVED from `workouts` rows
-- whose routine_id is in this enrollment's routine_ids array — so we never
-- need to mutate the row when a workout finishes. One active program per
-- user is enforced via a partial unique index.

create table if not exists public.program_enrollments (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users on delete cascade not null,
  program_id    text not null,                 -- template id, e.g. "ppl"
  program_name  text not null,                 -- snapshot of template name
  total_days    int  not null,                 -- snapshot of days.length
  days_per_week int  not null,                 -- snapshot of daysPerWeek
  routine_ids   uuid[] not null default '{}',  -- ordered: routine_ids[i] = Day i+1
  started_at    timestamptz not null default now(),
  ended_at      timestamptz,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- Exactly one active enrollment per user.
create unique index if not exists program_enrollments_one_active_per_user
  on public.program_enrollments (user_id)
  where is_active = true;

-- Fast lookup of "what was my history" sorted by recency.
create index if not exists program_enrollments_user_started_idx
  on public.program_enrollments (user_id, started_at desc);

alter table public.program_enrollments enable row level security;

drop policy if exists "Users can read own program enrollments" on public.program_enrollments;
create policy "Users can read own program enrollments"
  on public.program_enrollments for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create own program enrollments" on public.program_enrollments;
create policy "Users can create own program enrollments"
  on public.program_enrollments for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own program enrollments" on public.program_enrollments;
create policy "Users can update own program enrollments"
  on public.program_enrollments for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own program enrollments" on public.program_enrollments;
create policy "Users can delete own program enrollments"
  on public.program_enrollments for delete
  using (auth.uid() = user_id);
