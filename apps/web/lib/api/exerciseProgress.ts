// Per-exercise progression data layer.
//
// Powers the "drill into your bench progression" view: every completed
// session for one exercise, with derived metrics (best e1RM, top set
// volume) so the page just renders.
//
// Why look up by NAME and not exercise_id: the /exercises/[id] route is
// keyed by the FreeExerciseDb string id (e.g. "barbell_bench_press"),
// not the user's DB UUID. We resolve via name match against the exercises
// table, scoped to seeded library rows + the user's own custom rows.

import type { SupabaseClient } from "@supabase/supabase-js";
import { estimate1RM } from "@/lib/exerciseHistory";

export interface ProgressionSet {
  reps: number;
  weight: number;
  setIndex: number;
  isCompleted: boolean;
  setType: string | null;
}

export interface ProgressionSession {
  workoutId: string;
  date: string; // ISO
  sets: ProgressionSet[];
  bestWeight: number;       // heaviest set in the session
  bestE1RM: number;         // best estimated 1RM in the session
  topSetVolume: number;     // weight × reps of the heaviest set
  totalVolume: number;      // sum of weight × reps across all completed sets
}

export interface LifetimeBests {
  heaviestSet: { weight: number; reps: number; date: string } | null;
  mostReps:    { weight: number; reps: number; date: string } | null;
  biggestSetVolume: { weight: number; reps: number; volume: number; date: string } | null;
  bestE1RM:    { weight: number; reps: number; e1rm: number; date: string } | null;
}

export interface ExerciseProgression {
  exerciseDbId: string | null;
  sessions: ProgressionSession[];
  bests: LifetimeBests;
}

const EMPTY_BESTS: LifetimeBests = {
  heaviestSet: null,
  mostReps: null,
  biggestSetVolume: null,
  bestE1RM: null,
};

/**
 * Find the user's progression for an exercise by NAME. Case-insensitive
 * name match — joined through workout_sets so it works even when RLS
 * on the `exercises` table blocks direct reads (the same nested-join
 * pattern listMyExercises uses, and the reason the previous direct
 * `SELECT FROM exercises` version returned empty for real users).
 */
export async function getExerciseProgression(
  supabase: SupabaseClient,
  userId: string,
  exerciseName: string,
): Promise<ExerciseProgression> {
  // Pull every completed set for this user where the joined exercise
  // name matches. `inner` joins act as filters and project the matched
  // exercise id so we don't have to do a second lookup.
  const { data: rows } = await supabase
    .from("workout_sets")
    .select(
      "reps, weight, is_completed, order_index, set_type, " +
      "workout_exercises!inner(exercise_id, " +
      "exercises!inner(id, name), " +
      "workouts!inner(id, user_id, started_at, finished_at))",
    )
    .eq("workout_exercises.workouts.user_id", userId)
    .ilike("workout_exercises.exercises.name", exerciseName)
    .not("workout_exercises.workouts.finished_at", "is", null);

  if (!rows || rows.length === 0) {
    return { exerciseDbId: null, sessions: [], bests: EMPTY_BESTS };
  }

  let exerciseDbId: string | null = null;

  // Bucket sets by workout_id and compute per-session metrics.
  const byWorkout = new Map<string, ProgressionSession>();
  for (const r of rows as unknown as Array<{
    reps: number | null;
    weight: number | null;
    is_completed: boolean | null;
    order_index: number | null;
    set_type: string | null;
    workout_exercises: {
      exercise_id: string;
      exercises: { id: string; name: string } | null;
      workouts: { id: string; started_at: string; finished_at: string | null } | null;
    } | null;
  }>) {
    const w = r.workout_exercises?.workouts;
    if (!w?.id) continue;
    if (!exerciseDbId) {
      exerciseDbId = r.workout_exercises?.exercises?.id
        ?? r.workout_exercises?.exercise_id
        ?? null;
    }
    const reps = r.reps ?? 0;
    const weight = r.weight ?? 0;
    const isCompleted = r.is_completed !== false;
    const setIndex = r.order_index ?? 0;

    let session = byWorkout.get(w.id);
    if (!session) {
      session = {
        workoutId: w.id,
        date: w.started_at,
        sets: [],
        bestWeight: 0,
        bestE1RM: 0,
        topSetVolume: 0,
        totalVolume: 0,
      };
      byWorkout.set(w.id, session);
    }
    session.sets.push({
      reps, weight, setIndex,
      isCompleted,
      setType: r.set_type,
    });
  }

  // 4. Finalise per-session derived stats and sort sets by index.
  for (const session of byWorkout.values()) {
    session.sets.sort((a, b) => a.setIndex - b.setIndex);
    let topVol = 0;
    for (const s of session.sets) {
      if (!s.isCompleted) continue;
      const vol = s.weight * s.reps;
      session.totalVolume += vol;
      if (s.weight > session.bestWeight) session.bestWeight = s.weight;
      const e1 = estimate1RM(s.weight, s.reps);
      if (e1 > session.bestE1RM) session.bestE1RM = e1;
      if (vol > topVol) topVol = vol;
    }
    session.topSetVolume = topVol;
  }

  // 5. Sort sessions chronologically, oldest → newest, so charts can
  //    render left-to-right without re-sorting.
  const sessions = Array.from(byWorkout.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  // 6. Lifetime bests across all sessions.
  const bests: LifetimeBests = {
    heaviestSet: null,
    mostReps: null,
    biggestSetVolume: null,
    bestE1RM: null,
  };
  for (const session of sessions) {
    for (const s of session.sets) {
      if (!s.isCompleted || s.weight <= 0 || s.reps <= 0) continue;
      const vol = s.weight * s.reps;
      const e1 = estimate1RM(s.weight, s.reps);
      if (!bests.heaviestSet || s.weight > bests.heaviestSet.weight) {
        bests.heaviestSet = { weight: s.weight, reps: s.reps, date: session.date };
      }
      if (!bests.mostReps || s.reps > bests.mostReps.reps) {
        bests.mostReps = { weight: s.weight, reps: s.reps, date: session.date };
      }
      if (!bests.biggestSetVolume || vol > bests.biggestSetVolume.volume) {
        bests.biggestSetVolume = { weight: s.weight, reps: s.reps, volume: vol, date: session.date };
      }
      if (!bests.bestE1RM || e1 > bests.bestE1RM.e1rm) {
        bests.bestE1RM = { weight: s.weight, reps: s.reps, e1rm: e1, date: session.date };
      }
    }
  }

  return {
    exerciseDbId,
    sessions,
    bests,
  };
}
