-- ── Phase 10 safety net for exercise inserts ────────────────────
-- The /exercises/new "Custom Exercise" page writes:
--   name, muscle_group (text), muscle_groups (text[]), measurement_type,
--   equipment, instructions, is_custom, created_by_user_id
--
-- An earlier migration (20260428_exercises_columns.sql) added most of
-- these. This one is the belt-and-suspenders pass: every column the
-- app expects, idempotently (`add column if not exists`), so re-running
-- against any DB state — fresh, partially-migrated, fully-migrated —
-- is safe and lands the same end-state.
--
-- After applying this, the client-side fallback ladder in
-- apps/web/app/(app)/exercises/new/page.tsx becomes a defensive
-- belt — it will never have to actually fire, because every column
-- the insert touches is guaranteed to exist.

alter table public.exercises add column if not exists muscle_group       text;
alter table public.exercises add column if not exists muscle_groups      text[]   default '{}';
alter table public.exercises add column if not exists measurement_type   text     default 'weight_reps';
alter table public.exercises add column if not exists equipment          text;
alter table public.exercises add column if not exists instructions       text;
alter table public.exercises add column if not exists video_url          text;
alter table public.exercises add column if not exists is_custom          boolean  default false;
alter table public.exercises add column if not exists created_by_user_id uuid     references auth.users on delete set null;

-- Tell PostgREST to refresh its schema cache so the new columns are
-- visible to the JS client immediately, without waiting for the
-- automatic refresh interval.
notify pgrst, 'reload schema';
