"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { WorkoutCard } from "@/components/workout/WorkoutCard/WorkoutCard";
import { TopBar } from "@/components/layout/TopBar/TopBar";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import { Button } from "@/components/ui/Button/Button";
import type { Workout, SetType } from "@/types/api";
import styles from "./page.module.css";

const LIMIT = 20;

export default function WorkoutsPage() {
  const { supabase } = useAuth();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchPage = useCallback(async (p: number) => {
    if (p === 1) setLoading(true); else setLoadingMore(true);
    try {
      const from = (p - 1) * LIMIT;
      const to = from + LIMIT - 1;

      const { data, count } = await supabase
        .from("workouts")
        .select("*, workout_exercises(*, exercises(*), sets(*))", { count: "exact" })
        .not("finished_at", "is", null)
        .order("started_at", { ascending: false })
        .range(from, to);

      const mapped = (data ?? []).map(mapWorkout);
      setWorkouts((prev) => p === 1 ? mapped : [...prev, ...mapped]);
      setTotal(count ?? 0);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [supabase]);

  useEffect(() => { fetchPage(1); }, [fetchPage]);

  const hasMore = workouts.length < total;

  function loadMore() {
    const next = page + 1;
    setPage(next);
    fetchPage(next);
  }

  return (
    <div className={styles.page}>
      <TopBar title="History" />

      {loading ? (
        <div className={styles.loadingCenter}>
          <Spinner size={32} />
        </div>
      ) : workouts.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIconWrap}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
              <path d="M12 8v4l2.5 2.5" stroke="var(--text-tertiary)" strokeWidth="1.7" strokeLinecap="round" />
              <circle cx="12" cy="12" r="9" stroke="var(--text-tertiary)" strokeWidth="1.7" />
            </svg>
          </div>
          <p className={styles.emptyTitle}>No workouts yet</p>
          <p className={styles.emptySub}>Start a workout from the home tab to see your history here</p>
        </div>
      ) : (
        <div className={styles.content}>
          <p className={styles.count}>{total} workouts</p>
          <div className={styles.list}>
            {workouts.map((w) => (
              <WorkoutCard key={w.id} workout={w} />
            ))}
          </div>
          {hasMore && (
            <div className={styles.loadMoreWrapper}>
              <Button variant="secondary" onClick={loadMore} loading={loadingMore}>
                Load More
              </Button>
            </div>
          )}
        </div>
      )}
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
