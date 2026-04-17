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
