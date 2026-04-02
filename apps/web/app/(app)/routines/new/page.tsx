"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { TopBar } from "@/components/layout/TopBar/TopBar";
import { Input } from "@/components/ui/Input/Input";
import { Button } from "@/components/ui/Button/Button";
import { ExercisePicker } from "@/components/workout/ExercisePicker/ExercisePicker";
import type { Exercise } from "@/types/api";
import styles from "./page.module.css";

interface RoutineExerciseDraft {
  exerciseId: string;
  name: string;
  muscleGroups: string[];
  sets: number;
}

export default function NewRoutinePage() {
  const { supabase, user } = useAuth();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [exercises, setExercises] = useState<RoutineExerciseDraft[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleExerciseSelect(exercise: Exercise) {
    setError("");
    try {
      let exerciseId = "";

      const { data: existing, error: existingErr } = await supabase
        .from("exercises")
        .select("id")
        .ilike("name", exercise.name)
        .limit(1)
        .maybeSingle();

      if (existingErr) {
        throw new Error(existingErr.message);
      }

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

      setExercises((prev) => {
        if (prev.some((e) => e.exerciseId === exerciseId)) return prev;
        return [
          ...prev,
          {
            exerciseId,
            name: exercise.name,
            muscleGroups: exercise.muscleGroups ?? [],
            sets: 3,
          },
        ];
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add exercise");
    }
  }

  function removeExercise(idx: number) {
    setExercises((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateSets(idx: number, sets: number) {
    setExercises((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, sets: Math.max(1, sets) } : e))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!title.trim()) { setError("Routine name is required"); return; }
    if (!user?.id) { setError("Please sign in again and retry."); return; }

    setLoading(true);
    try {
      const basePayload = {
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
      };
      const { data: routineByTitle, error: routineErr } = await supabase
        .from("routines")
        .insert(basePayload)
        .select()
        .single();
      const missingTitleColumn = Boolean(
        routineErr?.message?.includes("title") && routineErr?.message?.includes("schema cache")
      );
      const userFkError = Boolean(
        routineErr?.message?.includes("routines_user_id_fkey")
      );

      let routine = routineByTitle;
      if (userFkError) {
        const { data: routineWithoutUser, error: routineWithoutUserErr } = await supabase
          .from("routines")
          .insert({
            title: title.trim(),
            description: description.trim() || null,
          })
          .select()
          .single();
        if (routineWithoutUserErr || !routineWithoutUser) {
          throw new Error(routineWithoutUserErr?.message ?? "Failed to create routine");
        }
        routine = routineWithoutUser;
      }
      if (missingTitleColumn) {
        const { data: routineByName, error: routineByNameErr } = await supabase
          .from("routines")
          .insert({
            user_id: userFkError ? null : user.id,
            name: title.trim(),
            description: description.trim() || null,
          })
          .select()
          .single();
        const userFkErrorOnName = Boolean(
          routineByNameErr?.message?.includes("routines_user_id_fkey")
        );
        if (routineByName?.id) {
          routine = routineByName;
        } else if (userFkErrorOnName) {
          const { data: routineByNameNoUser, error: routineByNameNoUserErr } = await supabase
            .from("routines")
            .insert({
              name: title.trim(),
              description: description.trim() || null,
            })
            .select()
            .single();
          if (routineByNameNoUserErr || !routineByNameNoUser) {
            throw new Error(routineByNameNoUserErr?.message ?? "Failed to create routine");
          }
          routine = routineByNameNoUser;
        } else {
          throw new Error(routineByNameErr?.message ?? "Failed to create routine");
        }
      }

      if ((!missingTitleColumn && !userFkError && routineErr) || !routine) {
        throw new Error(routineErr?.message ?? "Failed to create routine");
      }

      // Add exercises
      if (exercises.length > 0) {
        const { error: exErr } = await supabase.from("routine_exercises").insert(
          exercises.map((ex, i) => ({
            routine_id: routine.id,
            exercise_id: ex.exerciseId,
            order: i,
            sets_config: Array.from({ length: ex.sets }, () => ({
              setType: "normal",
              reps: null,
              weightKg: null,
            })),
          }))
        );
        if (exErr) {
          await supabase.from("routines").delete().eq("id", routine.id);
          throw new Error(exErr.message);
        }
      }

      router.replace(`/routines/${routine.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create routine");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <TopBar title="New Routine" showBack />

      <form className={styles.form} onSubmit={handleSubmit}>
        <Input
          label="Routine Name"
          placeholder="e.g. Push Day A"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Description (optional)</label>
          <textarea
            className={styles.textarea}
            placeholder="Brief description of this routine..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        {/* Exercises */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Exercises</label>
          <div className={styles.exerciseList}>
            {exercises.length === 0 && (
              <p className={styles.emptyHint}>No exercises yet. Add at least one to build your routine.</p>
            )}
            {exercises.map((ex, idx) => (
              <div key={`${ex.exerciseId}-${idx}`} className={styles.exRow}>
                <div className={styles.exInfo}>
                  <p className={styles.exName}>{ex.name}</p>
                  {ex.muscleGroups.length > 0 && (
                    <p className={styles.exMuscles}>{ex.muscleGroups.join(", ")}</p>
                  )}
                </div>
                <div className={styles.exRight}>
                  <div className={styles.setsControl}>
                    <button
                      type="button"
                      className={styles.setsBtn}
                      onClick={() => updateSets(idx, ex.sets - 1)}
                    >−</button>
                    <span className={styles.setsVal}>{ex.sets} sets</span>
                    <button
                      type="button"
                      className={styles.setsBtn}
                      onClick={() => updateSets(idx, ex.sets + 1)}
                    >+</button>
                  </div>
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => removeExercise(idx)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M18 6L6 18M6 6l12 12" stroke="var(--accent-red)" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              className={styles.addExBtn}
              onClick={() => setPickerOpen(true)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
              Add Exercise
            </button>
          </div>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <Button type="submit" fullWidth size="lg" loading={loading} disabled={loading || !title.trim()}>
          Create Routine
        </Button>
      </form>

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleExerciseSelect}
      />
    </div>
  );
}
