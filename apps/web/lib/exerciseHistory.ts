// ── Exercise history + PR lookup helpers ─────────────────────────────────
// Batched queries to avoid N+1 when loading an active workout.

import type { SupabaseClient } from "@supabase/supabase-js";

export interface ExercisePR {
  exerciseId: string;
  weight: number;
  reps: number;
  estimated1rm: number;
  achievedAt: string;
}

/** Fetch all-time PRs for a set of exercises in one query. */
export async function fetchPRsForExercises(
  supabase: SupabaseClient,
  exerciseIds: string[],
): Promise<Map<string, ExercisePR>> {
  const map = new Map<string, ExercisePR>();
  if (exerciseIds.length === 0) return map;
  try {
    const { data } = await supabase
      .from("personal_records")
      .select("exercise_id, weight, reps, estimated_1rm, achieved_at")
      .in("exercise_id", exerciseIds);
    (data ?? []).forEach((r: Record<string, unknown>) => {
      map.set(r.exercise_id as string, {
        exerciseId: r.exercise_id as string,
        weight: (r.weight as number) ?? 0,
        reps: (r.reps as number) ?? 0,
        estimated1rm: (r.estimated_1rm as number) ?? 0,
        achievedAt: (r.achieved_at as string) ?? "",
      });
    });
  } catch { /* ignore */ }
  return map;
}

/** Epley 1RM estimate. */
export function estimate1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

// ── Per-exercise lifetime bests ──────────────────────────────────────────
// What we need for real-time PR detection during a workout: for each
// exercise the user has on the current screen, the heaviest single rep
// ever, the highest rep count ever (at any weight > 0), the heaviest
// single-set volume (weight × reps), and the highest estimated 1RM. Each
// keystroke compares the current input against this snapshot and lights
// the gold trophy if any category would be beaten.
export interface ExerciseBest {
  bestWeight: number;
  bestReps: number;
  bestVolume: number;
  bestE1RM: number;
}

export const EMPTY_BEST: ExerciseBest = {
  bestWeight: 0,
  bestReps: 0,
  bestVolume: 0,
  bestE1RM: 0,
};

/**
 * Fetch lifetime best weight / reps / volume / e1RM for a set of exercises
 * in one query, scoped to the current user via RLS. Excludes sets from the
 * `excludeWorkoutId` (the active workout — we don't want to compare a set
 * against itself or against later sets in the same session).
 */
export async function fetchPreviousBests(
  supabase: SupabaseClient,
  exerciseIds: string[],
  excludeWorkoutId?: string | null,
): Promise<Map<string, ExerciseBest>> {
  const map = new Map<string, ExerciseBest>();
  if (exerciseIds.length === 0) return map;
  try {
    let query = supabase
      .from("workout_sets")
      .select("weight, reps, workout_exercises!inner(exercise_id, workout_id)")
      .in("workout_exercises.exercise_id", exerciseIds)
      .gt("weight", 0)
      .gt("reps", 0);
    if (excludeWorkoutId) {
      query = query.neq("workout_exercises.workout_id", excludeWorkoutId);
    }
    const { data } = await query;
    (data ?? []).forEach((row: Record<string, unknown>) => {
      const we = row.workout_exercises as Record<string, unknown> | null;
      if (!we) return;
      const exId = we.exercise_id as string;
      const w = (row.weight as number) ?? 0;
      const r = (row.reps as number) ?? 0;
      if (w <= 0 || r <= 0) return;
      const volume = w * r;
      const e1rm = w * (1 + r / 30);
      const cur = map.get(exId) ?? { ...EMPTY_BEST };
      if (w > cur.bestWeight) cur.bestWeight = w;
      if (r > cur.bestReps) cur.bestReps = r;
      if (volume > cur.bestVolume) cur.bestVolume = volume;
      if (e1rm > cur.bestE1RM) cur.bestE1RM = e1rm;
      map.set(exId, cur);
    });
  } catch {
    /* ignore — best becomes EMPTY_BEST and nothing lights up */
  }
  return map;
}

/**
 * Pure helper: given a single set's current weight + reps and the
 * exercise's lifetime best snapshot, return which categories (if any)
 * the set would beat. Used by SetRow to decide whether to render the
 * trophy in real-time as the user types.
 */
export function detectLivePR(
  weightKg: number,
  reps: number,
  best: ExerciseBest | undefined,
): { isPR: boolean; categories: Array<"weight" | "reps" | "volume" | "e1rm"> } {
  if (!best || weightKg <= 0 || reps <= 0) {
    return { isPR: false, categories: [] };
  }
  const cats: Array<"weight" | "reps" | "volume" | "e1rm"> = [];
  if (weightKg > best.bestWeight) cats.push("weight");
  if (reps > best.bestReps) cats.push("reps");
  if (weightKg * reps > best.bestVolume) cats.push("volume");
  if (weightKg * (1 + reps / 30) > best.bestE1RM) cats.push("e1rm");
  return { isPR: cats.length > 0, categories: cats };
}

/** Progressive-overload suggestion. */
export function progressiveOverloadHint(
  lastWeightKg: number,
  lastReps: number,
  targetReps: number = 10,
): { suggestWeight: number; reason: string } | null {
  if (lastWeightKg <= 0 || lastReps <= 0) return null;
  if (lastReps >= targetReps) {
    // Hit target reps → add 2.5kg (small plate on each side)
    return {
      suggestWeight: Math.round((lastWeightKg + 2.5) * 10) / 10,
      reason: `hit ${lastReps} reps last time`,
    };
  }
  if (lastReps >= Math.max(1, targetReps - 4)) {
    // Between (target-4) and (target-1) reps → same weight, push for +1 rep
    return {
      suggestWeight: lastWeightKg,
      reason: `aim for ${lastReps + 1}+ reps`,
    };
  }
  // Under-performed last time → drop 5-10%
  return {
    suggestWeight: Math.round(lastWeightKg * 0.92 * 10) / 10,
    reason: `build back from ${lastReps} reps`,
  };
}
