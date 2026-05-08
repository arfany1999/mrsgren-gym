// Workouts data layer.
//
// Centralises queries against the workouts / workout_exercises / workout_sets
// tables. Pages should reach for these helpers instead of constructing
// supabase queries inline so we have one place to update if the schema or
// RLS rules change.
import type { SupabaseClient } from "@supabase/supabase-js";

export interface WorkoutInfo {
  lastDate: string | null;
  lastVolume: number;
  /** -1 means "no previous workout exists" — used for the dashboard ring. */
  prevVolume: number;
}

/**
 * For a list of routine ids, return per-routine summary of the user's
 * last two completed sessions: lastDate, lastVolume, prevVolume. Used to
 * populate the dashboard's "Last: yesterday · ▲12%" chips.
 */
export async function getRoutineWorkoutInfo(
  supabase: SupabaseClient,
  userId: string,
  routineIds: string[],
): Promise<Map<string, WorkoutInfo>> {
  const out = new Map<string, WorkoutInfo>();
  if (routineIds.length === 0) return out;

  const { data } = await supabase
    .from("workouts")
    .select("routine_id, started_at, total_volume")
    .eq("user_id", userId)
    .in("routine_id", routineIds)
    .not("finished_at", "is", null)
    .order("started_at", { ascending: false });

  const byRoutine = new Map<string, Array<{ date: string; volume: number }>>();
  for (const w of (data ?? []) as Record<string, unknown>[]) {
    const rid = w.routine_id as string;
    if (!rid) continue;
    if (!byRoutine.has(rid)) byRoutine.set(rid, []);
    byRoutine.get(rid)!.push({
      date: w.started_at as string,
      volume: (w.total_volume as number) ?? 0,
    });
  }

  for (const [rid, list] of byRoutine) {
    out.set(rid, {
      lastDate: list[0]?.date ?? null,
      lastVolume: list[0]?.volume ?? 0,
      prevVolume: list.length > 1 ? (list[1]?.volume ?? 0) : -1,
    });
  }
  return out;
}

/**
 * All started_at timestamps for completed workouts, newest first. Used by
 * the dashboard's week-dot strip and the streak fallback.
 */
export async function listCompletedStartedAt(
  supabase: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const { data } = await supabase
    .from("workouts")
    .select("started_at")
    .eq("user_id", userId)
    .not("finished_at", "is", null)
    .order("started_at", { ascending: false });
  return ((data ?? []) as Array<{ started_at: string }>)
    .map((r) => r.started_at)
    .filter(Boolean);
}

/** Permanently delete a workout (ON DELETE CASCADE handles its sets). */
export async function deleteWorkout(
  supabase: SupabaseClient,
  workoutId: string,
): Promise<void> {
  const { error } = await supabase.from("workouts").delete().eq("id", workoutId);
  if (error) throw new Error(error.message);
}
