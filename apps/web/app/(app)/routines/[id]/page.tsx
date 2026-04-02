"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkout } from "@/contexts/WorkoutContext";
import { TopBar } from "@/components/layout/TopBar/TopBar";
import { Button } from "@/components/ui/Button/Button";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import { ExercisePicker } from "@/components/workout/ExercisePicker/ExercisePicker";
import type { Routine, Exercise } from "@/types/api";
import styles from "./page.module.css";

export default function RoutineDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { api } = useAuth();
  const { startWorkout } = useWorkout();
  const router = useRouter();

  const [routine, setRoutine] = useState<Routine | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  async function reload() {
    try {
      const r = await api.get<Routine>(`/routines/${id}`);
      setRoutine(r);
    } catch {
      router.replace("/routines");
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

  async function handleAddExercise(exerciseId: string) {
    if (!routine) return;
    const setsConfig = [{ setType: "normal", reps: null, weightKg: null }];
    await api.post(`/routines/${id}/exercises`, {
      exerciseId,
      order: routine.routineExercises.length,
      setsConfig,
    });
    reload();
  }

  async function handleRemoveExercise(reId: string) {
    await api.delete(`/routines/${id}/exercises/${reId}`);
    reload();
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
