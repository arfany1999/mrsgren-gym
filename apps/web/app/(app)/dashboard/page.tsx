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
  const { user, api } = useAuth();
  const { activeWorkout, startWorkout } = useWorkout();
  const router = useRouter();

  const [recentWorkouts, setRecentWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    api
      .get<{ workouts: Workout[] }>("/workouts?limit=5")
      .then((res) => setRecentWorkouts(res.workouts))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [api]);

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
  const firstName = user?.name.split(" ")[0] ?? "Athlete";

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
            {(user?.name?.[0] ?? "U").toUpperCase()}
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
