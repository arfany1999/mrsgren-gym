"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { TopBar } from "@/components/layout/TopBar/TopBar";
import { Button } from "@/components/ui/Button/Button";
import { Modal } from "@/components/ui/Modal/Modal";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import type { Workout } from "@/types/api";
import { formatDateFull, formatTime, workoutDuration, calcVolume } from "@/lib/formatters";
import styles from "./page.module.css";

export default function WorkoutDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { api } = useAuth();
  const router = useRouter();

  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.get<Workout>(`/workouts/${id}`)
      .then(setWorkout)
      .catch(() => router.replace("/workouts"))
      .finally(() => setLoading(false));
  }, [id, api, router]);

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.delete(`/workouts/${id}`);
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
