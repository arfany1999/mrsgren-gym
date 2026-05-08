// Client wrapper around the public.get_muscle_volume(lookback_days) RPC,
// with a client-side fallback so the UI populates even if the RPC isn't
// installed on the database.
// Returns { muscle: volume } map (kg × reps) for the authenticated user.

import type { SupabaseClient } from "@supabase/supabase-js";
import { parseMuscleGroup } from "@/lib/formatters";

export interface MuscleVolumeRow {
  muscle: string;
  volume: number;
  setCount: number;
}

interface RpcRow {
  muscle: string;
  volume: number | string;
  set_count: number;
}

export async function fetchMuscleVolume(
  supabase: SupabaseClient,
  lookbackDays = 30,
): Promise<MuscleVolumeRow[]> {
  const { data, error } = await supabase.rpc("get_muscle_volume", {
    lookback_days: lookbackDays,
  });
  if (!error && data && (data as RpcRow[]).length > 0) {
    return (data as RpcRow[]).map((r) => ({
      muscle: r.muscle,
      volume: Number(r.volume) || 0,
      setCount: r.set_count ?? 0,
    }));
  }
  // RPC missing / empty → compute client-side from completed sets.
  return computeMuscleVolumeLocal(supabase, lookbackDays);
}

interface SetRow {
  reps: number | null;
  weight: number | null;
  is_completed: boolean | null;
  workout_exercises: {
    workouts: { started_at: string; finished_at: string | null } | null;
    exercises: { muscle_group: string | null } | null;
  } | null;
}

/**
 * Client-side aggregation matching the RPC contract: completed sets in the
 * lookback window, grouped by muscle (each exercise's muscle_group split into
 * primary muscles and counted once per set on the primary).
 */
async function computeMuscleVolumeLocal(
  supabase: SupabaseClient,
  lookbackDays: number,
): Promise<MuscleVolumeRow[]> {
  const fromIso = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("workout_sets")
    .select(
      "reps, weight, is_completed, workout_exercises!inner(workouts!inner(started_at, finished_at), exercises(muscle_group))",
    )
    .gte("workout_exercises.workouts.started_at", fromIso)
    .not("workout_exercises.workouts.finished_at", "is", null);

  if (error || !data) return [];

  const byMuscle = new Map<string, { volume: number; setCount: number }>();
  for (const raw of data as unknown as SetRow[]) {
    if (raw.is_completed === false) continue;
    const we = raw.workout_exercises;
    const ex = we?.exercises ?? null;
    const muscles = parseMuscleGroup(ex?.muscle_group ?? null);
    const primary = muscles[0]?.toLowerCase();
    if (!primary) continue;
    const reps = raw.reps ?? 0;
    const weight = raw.weight ?? 0;
    const vol = reps * weight;
    const cur = byMuscle.get(primary) ?? { volume: 0, setCount: 0 };
    cur.volume += vol;
    cur.setCount += 1;
    byMuscle.set(primary, cur);
  }
  return Array.from(byMuscle.entries())
    .map(([muscle, v]) => ({ muscle, volume: v.volume, setCount: v.setCount }))
    .sort((a, b) => b.volume - a.volume);
}

/** Convenience: collapse rows into a { muscle: volume } map. */
export function muscleVolumeMap(rows: MuscleVolumeRow[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) out[r.muscle] = (out[r.muscle] ?? 0) + r.volume;
  return out;
}
