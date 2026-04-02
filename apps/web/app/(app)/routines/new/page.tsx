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
  const { supabase, user, profile } = useAuth();
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
      await ensureOwnProfileRow();
      const candidateUserIds = await resolveCandidateUserIds();
      const { routine, lastErr } = await createRoutineWithFallbacks(
        title.trim(),
        description.trim() || null,
        candidateUserIds
      );

      if (!routine) {
        throw new Error(lastErr ?? "Failed to create routine");
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

  async function resolveCandidateUserIds() {
    const ids = new Set<string>();
    if (profile?.id) ids.add(profile.id);
    if (user?.id) ids.add(user.id);

    const email = user?.email ?? profile?.email ?? null;
    const username =
      profile?.username ??
      ((user?.user_metadata?.username as string | undefined) ?? null);

    if (email) {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .limit(5);
      (data ?? []).forEach((row: { id: string }) => ids.add(row.id));
    }

    if (username) {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username)
        .limit(5);
      (data ?? []).forEach((row: { id: string }) => ids.add(row.id));
    }

    return Array.from(ids);
  }

  async function ensureOwnProfileRow() {
    if (!user?.id) return;
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          email: user.email ?? null,
          name:
            (meta.name as string) ||
            (meta.full_name as string) ||
            user.email?.split("@")[0] ||
            "Athlete",
          username: (meta.username as string) || user.email?.split("@")[0] || null,
        },
        { onConflict: "id" }
      );
  }

  async function createRoutineWithFallbacks(
    routineTitle: string,
    routineDescription: string | null,
    candidateUserIds: string[]
  ) {
    let routine: { id: string } | null = null;
    let lastErr: string | null = null;

    // 1) Try explicit owner ids first
    for (const candidateUserId of candidateUserIds) {
      const byTitle = await supabase
        .from("routines")
        .insert({
          user_id: candidateUserId,
          title: routineTitle,
          description: routineDescription,
        })
        .select()
        .single();
      if (byTitle.data?.id) {
        routine = byTitle.data;
        break;
      }

      const missingTitleColumn = Boolean(
        byTitle.error?.message?.includes("title") && byTitle.error?.message?.includes("schema cache")
      );
      const userFkError = Boolean(byTitle.error?.message?.includes("routines_user_id_fkey"));
      lastErr = byTitle.error?.message ?? lastErr;

      if (missingTitleColumn) {
        const byName = await supabase
          .from("routines")
          .insert({
            user_id: candidateUserId,
            name: routineTitle,
            description: routineDescription,
          })
          .select()
          .single();
        if (byName.data?.id) {
          routine = byName.data;
          break;
        }
        lastErr = byName.error?.message ?? lastErr;
        if (userFkError || byName.error?.message?.includes("routines_user_id_fkey")) continue;
      } else if (userFkError) {
        continue;
      }
    }

    // 2) Last resort: insert without user_id so DB default/trigger can assign owner
    if (!routine) {
      const byTitleNoOwner = await supabase
        .from("routines")
        .insert({
          title: routineTitle,
          description: routineDescription,
        })
        .select()
        .single();

      if (byTitleNoOwner.data?.id) {
        routine = byTitleNoOwner.data;
      } else {
        const missingTitleColumn = Boolean(
          byTitleNoOwner.error?.message?.includes("title") &&
          byTitleNoOwner.error?.message?.includes("schema cache")
        );
        lastErr = byTitleNoOwner.error?.message ?? lastErr;
        if (missingTitleColumn) {
          const byNameNoOwner = await supabase
            .from("routines")
            .insert({
              name: routineTitle,
              description: routineDescription,
            })
            .select()
            .single();
          if (byNameNoOwner.data?.id) {
            routine = byNameNoOwner.data;
          } else {
            lastErr = byNameNoOwner.error?.message ?? lastErr;
          }
        }
      }
    }

    return { routine, lastErr };
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
