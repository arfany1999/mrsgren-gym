"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkout } from "@/contexts/WorkoutContext";
import { WorkoutCard } from "@/components/workout/WorkoutCard/WorkoutCard";
import { Button } from "@/components/ui/Button/Button";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import { WorkoutTimer } from "@/components/workout/WorkoutTimer/WorkoutTimer";
import type { Workout } from "@/types/api";
import { formatDate } from "@/lib/formatters";
import styles from "./page.module.css";

export default function DashboardPage() {
  const { profile, supabase } = useAuth();
  const { activeWorkout, startWorkout } = useWorkout();
  const router = useRouter();

  const [recentWorkouts, setRecentWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase
          .from("workouts")
          .select("*, workout_exercises(*, exercises(*), sets(*))")
          .not("finished_at", "is", null)
          .order("started_at", { ascending: false })
          .limit(5);
        if (data) setRecentWorkouts(data.map(mapWorkout));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [supabase]);

  async function handleStartWorkout() {
    setStarting(true);
    try {
      await startWorkout();
      router.push("/active");
    } finally {
      setStarting(false);
    }
  }

  const today = formatDate(new Date().toISOString());
  const firstName = profile?.name?.split(" ")[0] ?? "Athlete";

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <p className={styles.greeting}>Good day, {firstName} 👋</p>
          <p className={styles.date}>{today}</p>
        </div>
        <Link href="/profile" className={styles.avatarLink}>
          <div className={styles.avatar}>
            {(profile?.name?.[0] ?? "U").toUpperCase()}
          </div>
        </Link>
      </div>

      {/* Active Workout Resume Banner */}
      {activeWorkout && (
        <Link href="/active" className={styles.resumeBanner}>
          <div className={styles.resumeLeft}>
            <span className={styles.resumeDot} />
            <div>
              <p className={styles.resumeTitle}>{activeWorkout.title}</p>
              <p className={styles.resumeSub}>Tap to resume</p>
            </div>
          </div>
          <WorkoutTimer />
        </Link>
      )}

      {/* Start Workout */}
      {!activeWorkout && (
        <div className={styles.startSection}>
          <Button fullWidth size="lg" onClick={handleStartWorkout} loading={starting}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="#000" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            Start Workout
          </Button>
        </div>
      )}

      {/* Recent Workouts */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Recent Workouts</h2>
          <Link href="/workouts" className={styles.seeAll}>See All</Link>
        </div>

        {loading ? (
          <div className={styles.loadingCenter}><Spinner size={28} /></div>
        ) : recentWorkouts.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyIcon}>🏋️‍♀️</p>
            <p className={styles.emptyTitle}>No workouts yet</p>
            <p className={styles.emptySub}>Start your first workout above!</p>
          </div>
        ) : (
          <div className={styles.workoutList}>
            {recentWorkouts.map((w) => (
              <WorkoutCard key={w.id} workout={w} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Map Supabase snake_case to the Workout type the UI expects
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
          setType: (s.set_type as string as import("@/types/api").SetType) ?? "normal",
          rpe: (s.rpe as number) ?? null,
          createdAt: s.created_at as string,
        })),
      };
    }),
  };
}
