"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import type { Workout } from "@/types/api";
import styles from "./page.module.css";

export default function DashboardPage() {
  const { profile, supabase } = useAuth();
  const router = useRouter();

  const [recentWorkouts, setRecentWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase
          .from("workouts")
          .select("*, workout_exercises(*, exercises(*), workout_sets(*))")
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

  const profileName = profile?.username || profile?.name || "athlete";
  const profileInitial = (profile?.name?.[0] ?? profile?.username?.[0] ?? "U").toUpperCase();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.homeTitle}>Home</h1>
          <button type="button" className={styles.chevBtn} aria-label="Select feed">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M6 9l6 6 6-6" stroke="var(--text-primary)" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.iconBtn} aria-label="Search">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="var(--text-primary)" strokeWidth="1.8" />
              <path d="M20 20l-3.5-3.5" stroke="var(--text-primary)" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
          <button type="button" className={styles.iconBtn} aria-label="Notifications">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M18 16v-5a6 6 0 10-12 0v5l-2 2h16l-2-2z" stroke="var(--text-primary)" strokeWidth="1.8" strokeLinejoin="round" />
              <path d="M10 20a2 2 0 004 0" stroke="var(--text-primary)" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </header>

      {loading ? (
        <div className={styles.loadingCenter}><Spinner size={28} /></div>
      ) : recentWorkouts.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>No workouts yet</p>
          <p className={styles.emptySub}>Start one from the Workout tab.</p>
        </div>
      ) : (
        <section className={styles.feed}>
          {recentWorkouts.map((w) => (
            <article key={w.id} className={styles.post} onClick={() => router.push(`/workouts/${w.id}`)}>
              <div className={styles.postHeader}>
                <div className={styles.postUser}>
                  <div className={styles.avatar}>{profileInitial}</div>
                  <div>
                    <p className={styles.userName}>{profileName}</p>
                    <p className={styles.timeAgo}>{timeAgo(w.startedAt)}</p>
                  </div>
                </div>
                <button type="button" className={styles.moreBtn} aria-label="More">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="6" cy="12" r="1.7" fill="var(--text-secondary)" />
                    <circle cx="12" cy="12" r="1.7" fill="var(--text-secondary)" />
                    <circle cx="18" cy="12" r="1.7" fill="var(--text-secondary)" />
                  </svg>
                </button>
              </div>
              <h2 className={styles.postTitle}>{w.title}</h2>
              <div className={styles.metrics}>
                <div>
                  <p className={styles.metricLabel}>Time</p>
                  <p className={styles.metricVal}>{estimateDuration(w)}</p>
                </div>
                <div>
                  <p className={styles.metricLabel}>Volume</p>
                  <p className={styles.metricVal}>{calcVolumeKg(w)} kg</p>
                </div>
              </div>
              <div className={styles.exercisePreview}>
                {w.workoutExercises.slice(0, 3).map((we) => (
                  <p key={we.id} className={styles.exerciseLine}>
                    {we.sets.length || 0} sets {we.exercise.name}
                  </p>
                ))}
                {w.workoutExercises.length > 3 && (
                  <p className={styles.moreExercises}>See {w.workoutExercises.length - 3} more exercise</p>
                )}
              </div>
              <div className={styles.postActions}>
                <button type="button" aria-label="Like" className={styles.actionBtn}>
                  <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
                    <path d="M8 11v8M8 11l3-7h3a1 1 0 011 1l-1 6h4a1 1 0 011 1l-1 6a2 2 0 01-2 2H8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    <rect x="4" y="11" width="4" height="8" rx="1" stroke="currentColor" strokeWidth="1.8"/>
                  </svg>
                </button>
                <button type="button" aria-label="Comment" className={styles.actionBtn}>
                  <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
                    <path d="M20 14a6 6 0 01-6 6H8l-4 2 1.4-3.3A6 6 0 018 4h6a6 6 0 016 6v4z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <button type="button" aria-label="Share" className={styles.actionBtn}>
                  <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
                    <path d="M12 4v12M8 8l4-4 4 4M5 14v4a2 2 0 002 2h10a2 2 0 002-2v-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </article>
          ))}
        </section>
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
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function estimateDuration(workout: Workout) {
  if (!workout.finishedAt) return "In progress";
  const ms = new Date(workout.finishedAt).getTime() - new Date(workout.startedAt).getTime();
  const mins = Math.max(1, Math.round(ms / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

function calcVolumeKg(workout: Workout) {
  const total = workout.workoutExercises
    .flatMap((we) => we.sets)
    .reduce((sum, s) => sum + ((s.reps ?? 0) * (s.weightKg ?? 0)), 0);
  return total.toLocaleString(undefined, { maximumFractionDigits: 1 });
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
          weightKg: (s.weight as number) ?? null,
          setType: (s.set_type as string as import("@/types/api").SetType) ?? "normal",
          rpe: (s.rpe as number) ?? null,
          createdAt: s.created_at as string,
        })),
      };
    }),
  };
}
