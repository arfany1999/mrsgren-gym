"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkout } from "@/contexts/WorkoutContext";
import { TopBar } from "@/components/layout/TopBar/TopBar";
import { Button } from "@/components/ui/Button/Button";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import { ExercisePicker } from "@/components/workout/ExercisePicker/ExercisePicker";
import type { Exercise, Routine } from "@/types/api";
import styles from "./page.module.css";

export default function RoutineDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { supabase } = useAuth();
  const { startWorkout } = useWorkout();
  const router = useRouter();

  const [routine, setRoutine] = useState<Routine | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState("");

  async function reload() {
    try {
      const { data, error } = await supabase
        .from("routines")
        .select("*, routine_exercises(*, exercises(*))")
        .eq("id", id)
        .single();
      if (error || !data) {
        router.replace("/routines");
        return;
      }
      setRoutine(mapRoutine(data));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { reload(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleStart() {
    setStarting(true);
    try {
      await startWorkout(id);
      router.push("/active");
    } finally {
      setStarting(false);
    }
  }

  async function handleAddExercise(exercise: Exercise) {
    if (!routine) return;
    setError("");
    try {
      let exerciseId = "";

      const { data: existing, error: existingErr } = await supabase
        .from("exercises")
        .select("id")
        .ilike("name", exercise.name)
        .limit(1)
        .maybeSingle();

      if (existingErr) throw new Error(existingErr.message);

      if (existing?.id) {
        exerciseId = existing.id;
      } else {
        const { data: inserted, error: insertErr } = await supabase
          .from("exercises")
          .insert({
            name: exercise.name,
            muscle_groups: exercise.muscleGroups,
            equipment: exercise.equipment,
            instructions: exercise.instructions,
            video_url: exercise.videoUrl,
            is_custom: false,
          })
          .select("id")
          .single();
        const missingMuscleGroupsColumn = Boolean(
          insertErr?.message?.includes("muscle_groups") && insertErr?.message?.includes("schema cache")
        );
        if (inserted?.id) {
          exerciseId = inserted.id;
        } else if (missingMuscleGroupsColumn) {
          const { data: fallbackInserted, error: fallbackErr } = await supabase
            .from("exercises")
            .insert({ name: exercise.name })
            .select("id")
            .single();
          if (fallbackErr || !fallbackInserted) {
            throw new Error(fallbackErr?.message ?? "Could not add exercise");
          }
          exerciseId = fallbackInserted.id;
        } else {
          throw new Error(insertErr?.message ?? "Could not add exercise");
        }
      }

      const alreadyInRoutine = routine.routineExercises.some((re) => re.exerciseId === exerciseId);
      if (alreadyInRoutine) return;

      const setsConfig = [{ setType: "normal", reps: null, weightKg: null }];
      const { error: addErr } = await supabase.from("routine_exercises").insert({
        routine_id: id,
        exercise_id: exerciseId,
        order: routine.routineExercises.length,
        sets_config: setsConfig,
      });

      if (addErr) throw new Error(addErr.message);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add exercise");
    }
  }

  async function handleRemoveExercise(reId: string) {
    setError("");
    const { error: removeErr } = await supabase.from("routine_exercises").delete().eq("id", reId);
    if (removeErr) {
      setError(removeErr.message);
      return;
    }
    await reload();
  }

  if (loading) return <div className={styles.loading}><Spinner size={32} /></div>;
  if (!routine) return null;

  return (
    <div className={styles.page}>
      <TopBar title={routine.title} showBack />

      <div className={styles.content}>
        {routine.description && (
          <p className={styles.desc}>{routine.description}</p>
        )}

        <div className={styles.meta}>
          <span>{routine.routineExercises.length} exercise{routine.routineExercises.length !== 1 ? "s" : ""}</span>
        </div>
        {error && <p className={styles.error}>{error}</p>}

        {/* Exercise list */}
        <div className={styles.exerciseList}>
          {routine.routineExercises.length === 0 ? (
            <p className={styles.noEx}>No exercises added yet</p>
          ) : (
            routine.routineExercises.map((re, idx) => (
              <div key={re.id} className={styles.exRow}>
                <div className={styles.exIdx}>{idx + 1}</div>
                <div className={styles.exInfo}>
                  <p className={styles.exName}>{re.exercise.name}</p>
                  {re.exercise.muscleGroups.length > 0 && (
                    <p className={styles.exMuscles}>{re.exercise.muscleGroups.join(", ")}</p>
                  )}
                  {re.setsConfig.length > 0 && (
                    <p className={styles.exSets}>{re.setsConfig.length} set{re.setsConfig.length !== 1 ? "s" : ""}</p>
                  )}
                </div>
                <button
                  className={styles.removeBtn}
                  onClick={() => handleRemoveExercise(re.id)}
                  type="button"
                  aria-label="Remove exercise"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="var(--accent-red)" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            ))
          )}
          <button
            className={styles.addExBtn}
            onClick={() => setPickerOpen(true)}
            type="button"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            Add Exercise
          </button>
        </div>

        {/* Start button */}
        <Button fullWidth size="lg" onClick={handleStart} loading={starting}>
          Start Workout
        </Button>
      </div>

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleAddExercise}
      />
    </div>
  );
}

function mapRoutine(row: Record<string, unknown>): Routine {
  const res = (row.routine_exercises as Record<string, unknown>[]) ?? [];
  return {
    id: row.id as string,
    userId: (row.user_id as string) ?? null,
    title: row.title as string,
    description: (row.description as string) ?? null,
    folderId: (row.folder_id as string) ?? null,
    isPublic: (row.is_public as boolean) ?? false,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    folder: null,
    routineExercises: res.map((re) => {
      const ex = (re.exercises as Record<string, unknown>) ?? {};
      return {
        id: re.id as string,
        routineId: re.routine_id as string,
        exerciseId: re.exercise_id as string,
        order: re.order as number,
        setsConfig: (re.sets_config as Routine["routineExercises"][0]["setsConfig"]) ?? [],
        exercise: {
          id: ex.id as string,
          name: ex.name as string,
          muscleGroups: (ex.muscle_groups as string[]) ?? [],
          equipment: (ex.equipment as string) ?? null,
          instructions: (ex.instructions as string) ?? null,
          videoUrl: (ex.video_url as string) ?? null,
          isCustom: (ex.is_custom as boolean) ?? false,
          createdByUserId: (ex.created_by_user_id as string) ?? null,
        },
      };
    }),
  };
}
