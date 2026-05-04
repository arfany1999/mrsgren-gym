create table if not exists public.body_measurements (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  measured_at date not null default current_date,
  weight_kg numeric,
  body_fat_pct numeric,
  notes text,
  created_at timestamptz default now() not null,
  unique(user_id, measured_at)
);

alter table public.body_measurements enable row level security;

create policy "Users can manage own measurements" on public.body_measurements
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
