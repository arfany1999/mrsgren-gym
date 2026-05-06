// ── Program enrollment helpers ─────────────────────────────────────────────
// "Following a program" is modelled as one row in `program_enrollments` per
// user with `is_active = true`. Progress (current day, weeks completed) is
// DERIVED at read time from the count of completed workouts whose routine_id
// is in the enrollment's routine_ids[] — that way we never have to mutate
// the enrollment row when a workout finishes, and the workout completion
// path stays oblivious to programs.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProgramTemplate } from "@/lib/programTemplates";

// ── Types ──────────────────────────────────────────────────────────────────

export interface ProgramEnrollment {
  id: string;
  user_id: string;
  program_id: string;
  program_name: string;
  total_days: number;
  days_per_week: number;
  routine_ids: string[];
  started_at: string;
  ended_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ActiveEnrollment extends ProgramEnrollment {
  /** Number of finished workouts attributable to this enrollment. */
  completedCount: number;
  /** Index into routine_ids for the workout the user should do next. */
  currentDayIndex: number;
  /** Full passes through total_days that the user has completed. */
  weeksCompleted: number;
  /** Routine the user should start next (or null if routine_ids is empty). */
  nextRoutineId: string | null;
}

// ── Reads ──────────────────────────────────────────────────────────────────

/**
 * Returns the user's active program enrollment with derived progress, or
 * null if they aren't currently following a program.
 */
export async function getActiveEnrollment(
  supabase: SupabaseClient,
  userId: string
): Promise<ActiveEnrollment | null> {
  const { data: row, error } = await supabase
    .from("program_enrollments")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !row) return null;
  const enrollment = row as ProgramEnrollment;

  let completedCount = 0;
  if (enrollment.routine_ids.length > 0) {
    const { count } = await supabase
      .from("workouts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("started_at", enrollment.started_at)
      .in("routine_id", enrollment.routine_ids)
      .not("finished_at", "is", null);
    completedCount = count ?? 0;
  }

  const totalDays = Math.max(1, enrollment.total_days);
  const currentDayIndex = completedCount % totalDays;
  const weeksCompleted = Math.floor(completedCount / totalDays);
  const nextRoutineId = enrollment.routine_ids[currentDayIndex] ?? null;

  return {
    ...enrollment,
    completedCount,
    currentDayIndex,
    weeksCompleted,
    nextRoutineId,
  };
}

// ── Writes ─────────────────────────────────────────────────────────────────

/**
 * Materialise a program template into routines + create an enrollment.
 *
 * - One routine row per program day, named "<Program> - <Day>".
 * - For each exercise, look up the matching `exercises.id` by ilike(name);
 *   skip silently if not found (template already has this guard).
 * - The created routine ids are stored in order in the enrollment.
 *
 * Returns the new enrollment id, or throws on hard failures (RLS, network).
 *
 * If the user already has an active enrollment, it is ended first so the
 * partial unique index never trips.
 */
export async function enrollInProgram(
  supabase: SupabaseClient,
  userId: string,
  template: ProgramTemplate
): Promise<string> {
  // 1) End any existing active enrollment so the unique index doesn't fire.
  await endActiveProgram(supabase, userId);

  // 2) Create one routine per program day.
  const routineIds: string[] = [];
  for (const day of template.days) {
    const { data: routine, error: rErr } = await supabase
      .from("routines")
      .insert({
        user_id: userId,
        name: `${template.name} - ${day.name}`,
        title: `${template.name} - ${day.name}`,
        description: template.description,
      })
      .select("id")
      .single();

    if (rErr || !routine) {
      throw new Error(rErr?.message ?? "Failed to create routine");
    }
    routineIds.push(routine.id as string);

    // Attach exercises (skip if exercise name not found in DB).
    for (let i = 0; i < day.exercises.length; i++) {
      const ex = day.exercises[i]!;
      const { data: found } = await supabase
        .from("exercises")
        .select("id")
        .ilike("name", ex.name)
        .limit(1)
        .maybeSingle();
      if (!found) continue;

      const setsConfig = Array.from({ length: ex.sets }, () => ({
        reps: null,
        weightKg: null,
      }));

      await supabase.from("routine_exercises").insert({
        routine_id: routine.id,
        exercise_id: found.id,
        order_index: i,
        sets_config: setsConfig,
      });
    }
  }

  // 3) Create the enrollment row.
  const { data: enrollment, error: eErr } = await supabase
    .from("program_enrollments")
    .insert({
      user_id: userId,
      program_id: template.id,
      program_name: template.name,
      total_days: template.days.length,
      days_per_week: template.daysPerWeek,
      routine_ids: routineIds,
      is_active: true,
    })
    .select("id")
    .single();

  if (eErr || !enrollment) {
    throw new Error(eErr?.message ?? "Failed to create program enrollment");
  }

  return enrollment.id as string;
}

/**
 * End the user's currently-active enrollment (if any). The routine rows
 * created at enrollment time are preserved — the user can keep doing them
 * as standalone routines, or delete them manually.
 */
export async function endActiveProgram(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  await supabase
    .from("program_enrollments")
    .update({ is_active: false, ended_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("is_active", true);
}
