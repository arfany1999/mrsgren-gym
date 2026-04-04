"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import type { Workout } from "@/types/api";
import { parseMuscleGroup } from "@/lib/formatters";
import styles from "./page.module.css";

export default function DashboardPage() {
  const { supabase } = useAuth();
  const router = useRouter();

  const [recentWorkouts, setRecentWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase
          .from("workouts")
          .select("id, title, started_at, finished_at, user_id, routine_id, notes, workout_exercises(id, workout_id, exercise_id, order_index, exercises(id, name, muscle_group), workout_sets(id, workout_exercise_id, reps, weight, set_type, rpe))")
          .not("finished_at", "is", null)
          .order("started_at", { ascending: false })
          .limit(10);
        if (data) setRecentWorkouts(data.map(mapWorkout));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [supabase]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Activity</h1>
      </header>

      {loading ? (
        <div className={styles.loading}><Spinner size={28} /></div>
      ) : recentWorkouts.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>No workouts yet</p>
          <p className={styles.emptySub}>Start a routine from the Workout tab.</p>
        </div>
      ) : (
        <div className={styles.list}>
          {recentWorkouts.map((w, i) => (
            <div
              key={w.id}
              className={styles.item}
              style={{ animationDelay: `${i * 40}ms` }}
              onClick={() => router.push(`/workouts/${w.id}`)}
            >
              <div className={styles.itemTop}>
                <h2 className={styles.workoutName}>{w.title}</h2>
                <span className={styles.timeAgo}>{timeAgo(w.startedAt)}</span>
              </div>

              <div className={styles.meta}>
                <span className={styles.metaItem}>{estimateDuration(w)}</span>
                {calcVolumeKg(w) !== "0" && (
                  <>
                    <span className={styles.metaDot}>·</span>
                    <span className={styles.metaItem}>{calcVolumeKg(w)} kg</span>
                  </>
                )}
                <span className={styles.metaDot}>·</span>
                <span className={styles.metaItem}>{w.workoutExercises.length} exercises</span>
              </div>

              <div className={styles.exercises}>
                {w.workoutExercises.slice(0, 3).map((we) => (
                  <span key={we.id} className={styles.exPill}>
                    {we.exercise.name}
                  </span>
                ))}
                {w.workoutExercises.length > 3 && (
                  <span className={styles.exMore}>+{w.workoutExercises.length - 3}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const date = new Date(dateStr);
  return `${date.getDate()} ${date.toLocaleString("default", { month: "short" })}`;
}

function estimateDuration(workout: Workout) {
  if (!workout.finishedAt) return "In progress";
  const ms = new Date(workout.finishedAt).getTime() - new Date(workout.startedAt).getTime();
  const mins = Math.max(1, Math.round(ms / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function calcVolumeKg(workout: Workout) {
  const total = workout.workoutExercises
    .flatMap((we) => we.sets)
    .reduce((sum, s) => sum + ((s.reps ?? 0) * (s.weightKg ?? 0)), 0);
  return total.toLocaleString(undefined, { maximumFractionDigits: 0 });
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
    isPublic: false,
    workoutExercises: wes.map((we) => {
      const ex = (we.exercises as Record<string, unknown>) ?? {};
      const sets = (we.workout_sets as Record<string, unknown>[]) ?? [];
      return {
        id: we.id as string,
        workoutId: we.workout_id as string,
        exerciseId: we.exercise_id as string,
        order: we.order as number,
        supersetId: null,
        exercise: {
          id: ex.id as string,
          name: ex.name as string,
          muscleGroups: parseMuscleGroup(ex.muscle_group),
          equipment: (ex.equipment as string) ?? null,
          instructions: (ex.instructions as string) ?? null,
          videoUrl: null,
          isCustom: (ex.is_custom as boolean) ?? false,
          createdByUserId: (ex.user_id as string) ?? null,
        },
        sets: sets.map((s) => ({
          id: s.id as string,
          workoutExerciseId: s.workout_exercise_id as string,
          reps: (s.reps as number) ?? null,
          weightKg: (s.weight as number) ?? null,
          setType: (s.set_type as import("@/types/api").SetType) ?? "normal",
          rpe: (s.rpe as number) ?? null,
          createdAt: "",
        })),
      };
    }),
  };
}
