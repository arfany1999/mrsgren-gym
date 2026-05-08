// "My Exercises" data layer.
//
// Powers the user-trained-exercises section at the top of /exercises.
// Returns the distinct set of exercises the user has ever logged a
// completed set for, with: total session count, most recent date, and
// recent estimated-1RM trajectory for the sparkline.
//
// Why this exists: the /exercises library shows the FreeExerciseDb
// (~870 entries with names like "Barbell Bench Press - Medium Grip").
// The user's saved exercises use different names ("Flat Barbell Bench
// Press"), so they never appear in the library list. Without this
// surface, the new per-exercise progression view (Phase 5) is invisible
// for the user's actual data.

import type { SupabaseClient } from "@supabase/supabase-js";
import { estimate1RM } from "@/lib/exerciseHistory";
import { parseMuscleGroup } from "@/lib/formatters";

export interface MyExerciseSummary {
  exerciseId: string;
  name: string;
  muscleGroups: string[];
  sessionCount: number;
  lastTrainedAt: string | null; // ISO
  /** Best estimated 1RM per session, oldest → newest, capped to 8 entries. */
  trend: number[];
  /** Best ever weight × reps for context on the card. */
  bestSet: { weight: number; reps: number } | null;
}

interface SetRow {
  reps: number | null;
  weight: number | null;
  is_completed: boolean | null;
  workout_exercises: {
    exercise_id: string;
    workouts: { id: string; started_at: string; finished_at: string | null } | null;
    exercises: { name: string; muscle_group: string | null } | null;
  } | null;
}

/**
 * List the user's actually-trained exercises, newest-trained first.
 * One Supabase query: pulls every completed set with the joined
 * exercise + workout metadata, then aggregates client-side. For users
 * with hundreds of sessions this stays well under the response-size
 * limit because we project narrow fields and rely on `inner` joins.
 */
export async function listMyExercises(
  supabase: SupabaseClient,
  userId: string,
): Promise<MyExerciseSummary[]> {
  const { data, error } = await supabase
    .from("workout_sets")
    .select(
      "reps, weight, is_completed, " +
      "workout_exercises!inner(exercise_id, " +
      "workouts!inner(id, user_id, started_at, finished_at), " +
      "exercises(name, muscle_group))",
    )
    .eq("workout_exercises.workouts.user_id", userId)
    .not("workout_exercises.workouts.finished_at", "is", null);
  if (error || !data) return [];

  // Bucket: exerciseId → { name, muscle_group, sessions: Map<workoutId, { date, bestE1RM, bestSet }> }
  const byExercise = new Map<
    string,
    {
      name: string;
      muscleGroups: string[];
      sessions: Map<string, { date: string; bestE1RM: number; bestSet: { weight: number; reps: number } | null }>;
      bestSetEver: { weight: number; reps: number } | null;
    }
  >();

  for (const raw of data as unknown as SetRow[]) {
    const we = raw.workout_exercises;
    const w = we?.workouts;
    const ex = we?.exercises;
    if (!we?.exercise_id || !w?.id || !ex?.name) continue;
    if (raw.is_completed === false) continue;
    const reps = raw.reps ?? 0;
    const weight = raw.weight ?? 0;
    if (reps <= 0 && weight <= 0) continue;

    let entry = byExercise.get(we.exercise_id);
    if (!entry) {
      entry = {
        name: ex.name,
        muscleGroups: parseMuscleGroup(ex.muscle_group),
        sessions: new Map(),
        bestSetEver: null,
      };
      byExercise.set(we.exercise_id, entry);
    }
    let session = entry.sessions.get(w.id);
    if (!session) {
      session = { date: w.started_at, bestE1RM: 0, bestSet: null };
      entry.sessions.set(w.id, session);
    }
    const e1 = estimate1RM(weight, reps);
    if (e1 > session.bestE1RM) {
      session.bestE1RM = e1;
      session.bestSet = { weight, reps };
    }
    if (!entry.bestSetEver || weight > entry.bestSetEver.weight) {
      entry.bestSetEver = { weight, reps };
    }
  }

  const out: MyExerciseSummary[] = [];
  for (const [exerciseId, entry] of byExercise) {
    const sessions = Array.from(entry.sessions.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    out.push({
      exerciseId,
      name: entry.name,
      muscleGroups: entry.muscleGroups,
      sessionCount: sessions.length,
      lastTrainedAt: sessions[sessions.length - 1]?.date ?? null,
      // Last 8 sessions of best-1RM, for the card sparkline.
      trend: sessions.slice(-8).map((s) => s.bestE1RM).filter((v) => v > 0),
      bestSet: entry.bestSetEver,
    });
  }

  // Newest-trained first.
  out.sort((a, b) => {
    const aT = a.lastTrainedAt ? new Date(a.lastTrainedAt).getTime() : 0;
    const bT = b.lastTrainedAt ? new Date(b.lastTrainedAt).getTime() : 0;
    return bT - aT;
  });

  return out;
}
