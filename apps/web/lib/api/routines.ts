// Routines data layer.
//
// All queries against the routines / routine_exercises tables live here so
// pages can ask for "the things I want to show" instead of writing the
// underlying joins inline. When (not if) the schema changes or we move to
// RPCs, only this file needs to change.
import type { SupabaseClient } from "@supabase/supabase-js";
import { parseMuscleGroup } from "@/lib/formatters";

export interface RoutineExerciseSummary {
  id: string;
  name: string;
  muscleGroups: string[];
  setsConfig: Array<{ reps: number | null; weightKg: number | null }>;
}

export interface RoutineSummary {
  id: string;
  title: string;
  description: string | null;
  exercises: RoutineExerciseSummary[];
  totalSets: number;
}

const ROUTINE_SELECT =
  "id, name, description, user_id, created_at, folder_id, " +
  "routine_exercises(id, exercise_id, order_index, sets_config, exercises(id, name, muscle_group))";

function mapRoutineRow(row: Record<string, unknown>): RoutineSummary {
  const res = (row.routine_exercises as Record<string, unknown>[]) ?? [];
  const exercises: RoutineExerciseSummary[] = res
    .slice()
    .sort((a, b) => ((a.order_index ?? 0) as number) - ((b.order_index ?? 0) as number))
    .map((re) => {
      const ex = (re.exercises as Record<string, unknown>) ?? {};
      const cfg = re.sets_config as Array<Record<string, unknown>> | null;
      const sets = Array.isArray(cfg) && cfg.length > 0
        ? cfg.map((s) => ({
            reps: (s.reps as number) ?? null,
            weightKg: (s.weight as number) ?? null,
          }))
        : Array.from({ length: 3 }, () => ({ reps: null as number | null, weightKg: null as number | null }));
      return {
        id: ex.id as string,
        name: (ex.name as string) ?? "",
        muscleGroups: parseMuscleGroup(ex.muscle_group as string),
        setsConfig: sets,
      };
    });
  return {
    id: row.id as string,
    title: (row.name as string) ?? "Routine",
    description: (row.description as string) ?? null,
    exercises,
    totalSets: exercises.reduce(
      (sum, ex) => sum + (Array.isArray(ex.setsConfig) ? ex.setsConfig.length : 0),
      0,
    ),
  };
}

/** Routines owned by `userId`, newest first. */
export async function listMyRoutines(
  supabase: SupabaseClient,
  userId: string,
): Promise<RoutineSummary[]> {
  const { data } = await supabase
    .from("routines")
    .select(ROUTINE_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return ((data ?? []) as unknown as Record<string, unknown>[]).map(mapRoutineRow);
}

/** Public/shared routines NOT owned by `userId` (for the Explore tab). */
export async function listLibraryRoutines(
  supabase: SupabaseClient,
  userId: string,
): Promise<RoutineSummary[]> {
  const { data, error } = await supabase
    .from("routines")
    .select(ROUTINE_SELECT)
    .neq("user_id", userId);
  if (error) return [];
  return ((data ?? []) as unknown as Record<string, unknown>[]).map(mapRoutineRow);
}

/** Update a routine's display name. */
export async function renameRoutine(
  supabase: SupabaseClient,
  routineId: string,
  name: string,
): Promise<void> {
  const { error } = await supabase.from("routines").update({ name }).eq("id", routineId);
  if (error) throw new Error(error.message);
}

/**
 * Delete a routine and its routine_exercises. Two statements rather than a
 * single ON DELETE CASCADE so we can surface the table-level error from
 * the row delete cleanly.
 */
export async function deleteRoutine(
  supabase: SupabaseClient,
  routineId: string,
): Promise<void> {
  await supabase.from("routine_exercises").delete().eq("routine_id", routineId);
  const { error } = await supabase.from("routines").delete().eq("id", routineId);
  if (error) throw new Error(error.message);
}

/**
 * Duplicate an existing routine into the calling user's library. Returns the
 * new routine id, or throws if the insert was rejected.
 */
export async function copyRoutine(
  supabase: SupabaseClient,
  userId: string,
  sourceId: string,
): Promise<string> {
  const { data: src } = await supabase
    .from("routines")
    .select("*, routine_exercises(*, exercises(*))")
    .eq("id", sourceId)
    .single();
  if (!src) throw new Error("Source routine not found");

  const { data: newRoutine, error } = await supabase
    .from("routines")
    .insert({
      user_id: userId,
      name: ((src.name as string) ?? "Routine"),
      description: src.description ?? null,
    })
    .select()
    .single();
  if (error || !newRoutine) throw new Error(error?.message ?? "Failed to copy");

  const res = (src.routine_exercises as Record<string, unknown>[]) ?? [];
  if (res.length > 0) {
    await supabase.from("routine_exercises").insert(
      res.map((re, i) => ({
        routine_id: newRoutine.id,
        exercise_id: re.exercise_id,
        order_index: ((re.order_index ?? re["order"]) ?? i) as number,
        sets_config: (re.sets_config ?? []) as unknown[],
      })),
    );
  }

  return newRoutine.id as string;
}
