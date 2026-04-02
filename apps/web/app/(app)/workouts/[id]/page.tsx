"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { TopBar } from "@/components/layout/TopBar/TopBar";
import { Button } from "@/components/ui/Button/Button";
import { Modal } from "@/components/ui/Modal/Modal";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import type { Workout, SetType } from "@/types/api";
import { formatDateFull, formatTime, workoutDuration, calcVolume } from "@/lib/formatters";
import styles from "./page.module.css";

export default function WorkoutDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { supabase } = useAuth();
  const router = useRouter();

  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase
          .from("workouts")
          .select("*, workout_exercises(*, exercises(*), sets(*))")
          .eq("id", id)
          .single();
        if (error || !data) {
          router.replace("/workouts");
          return;
        }
        setWorkout(mapWorkout(data));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, supabase, router]);

  async function handleDelete() {
    setDeleting(true);
    try {
      await supabase.from("workouts").delete().eq("id", id);
      router.replace("/workouts");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return (
    <div className={styles.loading}><Spinner size={32} /></div>
  );

  if (!workout) return null;

  const allSets = workout.workoutExercises.flatMap((we) => we.sets);
  const volume = calcVolume(allSets);
  const duration = workoutDuration(workout.startedAt, workout.finishedAt);
  const isFinished = !!workout.finishedAt;

  return (
    <div className={styles.page}>
      <TopBar
        title={workout.title}
        showBack
        rightAction={
          <button className={styles.deleteBtn} onClick={() => setDeleteOpen(true)} type="button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="var(--accent-red)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        }
      />

      <div className={styles.content}>
        {/* Summary */}
        <div className={styles.summary}>
          <div className={styles.summaryMeta}>
            <p className={styles.summaryDate}>{formatDateFull(workout.startedAt)}</p>
            <p className={styles.summaryTime}>
              {formatTime(workout.startedAt)}
              {workout.finishedAt && ` – ${formatTime(workout.finishedAt)}`}
            </p>
          </div>

          <div className={styles.summaryStats}>
            {isFinished && (
              <div className={styles.stat}>
                <p className={styles.statVal}>{duration}</p>
                <p className={styles.statLabel}>Duration</p>
              </div>
            )}
            <div className={styles.stat}>
              <p className={styles.statVal}>{workout.workoutExercises.length}</p>
              <p className={styles.statLabel}>Exercises</p>
            </div>
            <div className={styles.stat}>
              <p className={styles.statVal}>{allSets.length}</p>
              <p className={styles.statLabel}>Sets</p>
            </div>
            {volume > 0 && (
              <div className={styles.stat}>
                <p className={styles.statVal}>{volume.toLocaleString()}</p>
                <p className={styles.statLabel}>kg Volume</p>
              </div>
            )}
          </div>

          {workout.notes && (
            <div className={styles.notes}>
              <p className={styles.notesLabel}>Notes</p>
              <p className={styles.notesText}>{workout.notes}</p>
            </div>
          )}
        </div>

        {/* Exercises */}
        <div className={styles.exercises}>
          {workout.workoutExercises.map((we) => (
            <div key={we.id} className={styles.exerciseBlock}>
              <h3 className={styles.exName}>{we.exercise.name}</h3>
              {we.exercise.muscleGroups.length > 0 && (
                <p className={styles.exMuscles}>{we.exercise.muscleGroups.join(", ")}</p>
              )}
              <div className={styles.setsTable}>
                <div className={styles.setsHeader}>
                  <span>Set</span>
                  <span>Weight</span>
                  <span>Reps</span>
                  <span>Type</span>
                </div>
                {we.sets.map((s, i) => (
                  <div key={s.id} className={styles.setRow}>
                    <span className={styles.setNum}>{i + 1}</span>
                    <span>{s.weightKg != null ? `${s.weightKg} kg` : "—"}</span>
                    <span>{s.reps != null ? s.reps : "—"}</span>
                    <span className={[styles.setType, styles[s.setType]].join(" ")}>
                      {s.setType === "normal" ? "·" : (s.setType[0] ?? "·").toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Delete Modal */}
      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete Workout?">
        <p className={styles.modalText}>This action cannot be undone.</p>
        <div className={styles.modalActions}>
          <Button variant="secondary" onClick={() => setDeleteOpen(false)} fullWidth>Cancel</Button>
          <Button variant="danger" onClick={handleDelete} loading={deleting} fullWidth>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}

function mapWorkout(row: Record<string, unknown>): Workout {
  const wes = (row.workout_exercises as Record<string, unknown>[]) ?? [];
  return {
    id: row.id as string,
    userId: row.user_id as string,
    routineId: (row.routine_id as string) ?? null,
    title: row.title as string,
    notes: (row.notes as string) ?? null,
    startedAt: row.started_at as string,
    finishedAt: (row.finished_at as string) ?? null,
    isPublic: (row.is_public as boolean) ?? false,
    workoutExercises: wes.map((we) => {
      const ex = (we.exercises as Record<string, unknown>) ?? {};
      const sets = (we.sets as Record<string, unknown>[]) ?? [];
      return {
        id: we.id as string,
        workoutId: we.workout_id as string,
        exerciseId: we.exercise_id as string,
        order: we.order as number,
        supersetId: null,
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
        sets: sets.map((s) => ({
          id: s.id as string,
          workoutExerciseId: s.workout_exercise_id as string,
          reps: (s.reps as number) ?? null,
          weightKg: (s.weight_kg as number) ?? null,
          setType: (s.set_type as SetType) ?? "normal",
          rpe: (s.rpe as number) ?? null,
          createdAt: s.created_at as string,
        })),
      };
    }),
  };
}
