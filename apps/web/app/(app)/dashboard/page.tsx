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
          .select("id, title, started_at, finished_at, user_id, routine_id, notes, is_public, workout_exercises(id, workout_id, exercise_id, order_index, exercises(id, name, muscle_groups), workout_sets(id, workout_exercise_id, reps, weight, set_type, rpe, created_at))")
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

  const profileName = profile?.username || profile?.name || "athlete";
  const profileInitial = (profile?.name?.[0] ?? profile?.username?.[0] ?? "U").toUpperCase();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.homeTitle}>Home</h1>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.iconBtn} aria-label="Search">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="var(--text-secondary)" strokeWidth="1.8" />
              <path d="M20 20l-3.5-3.5" stroke="var(--text-secondary)" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
          <button type="button" className={styles.iconBtn} aria-label="Notifications">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M18 16v-5a6 6 0 10-12 0v5l-2 2h16l-2-2z" stroke="var(--text-secondary)" strokeWidth="1.8" strokeLinejoin="round" />
              <path d="M10 20a2 2 0 004 0" stroke="var(--text-secondary)" strokeWidth="1.8" strokeLinecap="round" />
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
            <article key={w.id} className={styles.post}>
              {/* Header: avatar + name + time + more */}
              <div className={styles.postHeader}>
                <div className={styles.postUser}>
                  <div className={styles.avatar}>{profileInitial}</div>
                  <div>
                    <p className={styles.userName}>{profileName}</p>
                    <p className={styles.timeAgo}>{timeAgo(w.startedAt)}</p>
                  </div>
                </div>
                <button type="button" className={styles.moreBtn} aria-label="More" onClick={() => router.push(`/workouts/${w.id}`)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle cx="5" cy="12" r="1.5" fill="var(--text-secondary)" />
                    <circle cx="12" cy="12" r="1.5" fill="var(--text-secondary)" />
                    <circle cx="19" cy="12" r="1.5" fill="var(--text-secondary)" />
                  </svg>
                </button>
              </div>

              {/* Title */}
              <h2 className={styles.postTitle} onClick={() => router.push(`/workouts/${w.id}`)}>
                {w.title}
              </h2>

              {/* Metrics */}
              <div className={styles.metrics}>
                <div className={styles.metricItem}>
                  <p className={styles.metricLabel}>Duration</p>
                  <p className={styles.metricVal}>{estimateDuration(w)}</p>
                </div>
                <div className={styles.metricItem}>
                  <p className={styles.metricLabel}>Volume</p>
                  <p className={styles.metricVal}>{calcVolumeKg(w)} kg</p>
                </div>
              </div>

              {/* Separator */}
              <div className={styles.separator} />

              {/* Exercises */}
              <div className={styles.exerciseList}>
                {w.workoutExercises.slice(0, 3).map((we) => {
                  const setsCount = we.sets.length;
                  const label = setsCount === 1 ? "1 set" : `${setsCount} sets`;
                  return (
                    <div key={we.id} className={styles.exRow}>
                      <div className={styles.exIcon}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <rect x="3" y="9" width="4" height="6" rx="1" stroke="#888" strokeWidth="1.5"/>
                          <rect x="17" y="9" width="4" height="6" rx="1" stroke="#888" strokeWidth="1.5"/>
                          <rect x="7" y="10.5" width="10" height="3" rx="1.5" stroke="#888" strokeWidth="1.5"/>
                        </svg>
                      </div>
                      <p className={styles.exText}>
                        <span className={styles.exSets}>{label}</span>
                        {" "}{we.exercise.name}
                      </p>
                    </div>
                  );
                })}
                {w.workoutExercises.length > 3 && (
                  <button type="button" className={styles.moreEx} onClick={() => router.push(`/workouts/${w.id}`)}>
                    See {w.workoutExercises.length - 3} more exercise{w.workoutExercises.length - 3 !== 1 ? "s" : ""}
                  </button>
                )}
              </div>

              {/* Actions: like/comment/share with counts */}
              <div className={styles.postActions}>
                <button type="button" className={styles.actionBtn} aria-label="Like">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>0</span>
                </button>
                <button type="button" className={styles.actionBtn} aria-label="Comment">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>0</span>
                </button>
                <button type="button" className={styles.actionBtn} aria-label="Share">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M12 4v12M8 8l4-4 4 4M5 14v4a2 2 0 002 2h10a2 2 0 002-2v-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>

              {/* Comment input */}
              <div className={styles.commentRow}>
                <div className={styles.commentAvatar}>{profileInitial}</div>
                <div className={styles.commentInput}>Write a comment...</div>
                <button type="button" className={styles.postCommentBtn}>Post</button>
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
  if (mins < 60) return `${mins} minutes ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const date = new Date(dateStr);
  return `${date.getDate()} ${date.toLocaleString("default", { month: "short" })} ${date.getFullYear()}, ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
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
          setType: (s.set_type as import("@/types/api").SetType) ?? "normal",
          rpe: (s.rpe as number) ?? null,
          createdAt: s.created_at as string,
        })),
      };
    }),
  };
}
