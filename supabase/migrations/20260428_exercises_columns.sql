-- ── Add columns the app code expects but production never got ─────────────
-- The app's routine builder writes `measurement_type`, `is_custom`, and
-- `created_by_user_id` when it inserts a custom exercise. Until this
-- migration ran, prod's `exercises` table was missing those columns and
-- every "Add Exercise" tap errored out with
--   ERROR: 42703: column "measurement_type" of relation "exercises" does not exist
-- which presented to the user as "I can't add anything to my routine."
--
-- All `add column if not exists` so re-running this is safe.

alter table public.exercises add column if not exists measurement_type text default 'weight_reps';
alter table public.exercises add column if not exists is_custom boolean default false;
alter table public.exercises add column if not exists created_by_user_id uuid references auth.users on delete set null;
alter table public.exercises add column if not exists muscle_groups text[] default '{}';
alter table public.exercises add column if not exists equipment text;
alter table public.exercises add column if not exists instructions text;
alter table public.exercises add column if not exists video_url text;
