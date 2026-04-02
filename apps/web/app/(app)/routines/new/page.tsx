"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { TopBar } from "@/components/layout/TopBar/TopBar";
import { Input } from "@/components/ui/Input/Input";
import { Button } from "@/components/ui/Button/Button";
import { ExercisePicker } from "@/components/workout/ExercisePicker/ExercisePicker";
import { ApiError } from "@/lib/api";
import type { Exercise } from "@/types/api";
import styles from "./page.module.css";

interface RoutineExerciseDraft {
  exerciseId: string;
  name: string;
  muscleGroups: string[];
  sets: number;
}

export default function NewRoutinePage() {
  const { api } = useAuth();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [exercises, setExercises] = useState<RoutineExerciseDraft[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleExerciseSelect(exerciseId: string) {
    try {
      const ex = await api.get<Exercise>(`/exercises/${exerciseId}`);
      setExercises((prev) => [
        ...prev,
        { exerciseId: ex.id, name: ex.name, muscleGroups: ex.muscleGroups, sets: 3 },
      ]);
    } catch {
      // ignore
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

    setLoading(true);
    try {
      const routine = await api.post<{ id: string }>("/routines", {
        title: title.trim(),
        description: description || null,
        isPublic: false,
      });

      // Add exercises
      for (let i = 0; i < exercises.length; i++) {
        const ex = exercises[i]!;
        const setsConfig = Array.from({ length: ex.sets }, () => ({
          setType: "normal" as const, reps: undefined, weightKg: undefined,
        }));
        await api.post(`/routines/${routine.id}/exercises`, {
          exerciseId: ex.exerciseId,
          order: i,
          setsConfig,
        });
      }

      router.replace(`/routines/${routine.id}`);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Failed to create routine");
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

        <Button type="submit" fullWidth size="lg" loading={loading}>
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
