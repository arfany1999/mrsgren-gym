"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { TopBar } from "@/components/layout/TopBar/TopBar";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import styles from "./page.module.css";

interface PR {
  exercise: string;
  weight: number;
  reps: number;
  estimated1rm: number;
  achievedAt: string;
}

interface Stats {
  totalWorkouts: number;
  totalDurationHrs: number;
  totalVolumeKg: number;
  totalSets: number;
  avgDurationMins: number;
}

export default function StatisticsPage() {
  const { supabase } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [prs, setPrs] = useState<PR[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [workoutsRes, prsRes, setsRes] = await Promise.all([
          supabase
            .from("workouts")
            .select("duration_secs, total_volume")
            .not("finished_at", "is", null),
          supabase
            .from("personal_records")
            .select("weight, reps, estimated_1rm, achieved_at, exercises(name)")
            .order("estimated_1rm", { ascending: false })
            .limit(10),
          supabase
            .from("workout_sets")
            .select("id", { count: "exact", head: true }),
        ]);

        const workouts = workoutsRes.data ?? [];
        const totalWorkouts = workouts.length;
        const totalDurationSecs = workouts.reduce((s, w) => s + (w.duration_secs ?? 0), 0);
        const totalVolumeKg = workouts.reduce((s, w) => s + (w.total_volume ?? 0), 0);

        setStats({
          totalWorkouts,
          totalDurationHrs: totalDurationSecs / 3600,
          totalVolumeKg,
          totalSets: setsRes.count ?? 0,
          avgDurationMins: totalWorkouts > 0 ? totalDurationSecs / totalWorkouts / 60 : 0,
        });

        setPrs(
          (prsRes.data ?? []).map((r: Record<string, unknown>) => {
            const ex = r.exercises as Record<string, unknown> | null;
            return {
              exercise: (ex?.name as string) ?? "Unknown",
              weight: r.weight as number,
              reps: r.reps as number,
              estimated1rm: r.estimated_1rm as number,
              achievedAt: r.achieved_at as string,
            };
          })
        );
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [supabase]);

  return (
    <div className={styles.page}>
      <TopBar title="Statistics" showBack />

      {loading ? (
        <div className={styles.center}><Spinner size={28} /></div>
      ) : (
        <>
          <section className={styles.statGrid}>
            <div className={styles.statCard}>
              <p className={styles.statValue}>{stats?.totalWorkouts ?? 0}</p>
              <p className={styles.statLabel}>Workouts</p>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statValue}>{(stats?.totalDurationHrs ?? 0).toFixed(1)}</p>
              <p className={styles.statLabel}>Hours Total</p>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statValue}>{Math.round(stats?.totalVolumeKg ?? 0).toLocaleString()}</p>
              <p className={styles.statLabel}>kg Volume</p>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statValue}>{stats?.totalSets ?? 0}</p>
              <p className={styles.statLabel}>Sets Logged</p>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statValue}>{Math.round(stats?.avgDurationMins ?? 0)}</p>
              <p className={styles.statLabel}>Avg Minutes</p>
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Personal Records</h2>
            {prs.length === 0 ? (
              <p className={styles.empty}>No personal records yet. Complete workouts to track PRs.</p>
            ) : (
              <div className={styles.prList}>
                {prs.map((pr, i) => (
                  <div key={i} className={styles.prRow}>
                    <div className={styles.prInfo}>
                      <p className={styles.prExercise}>{pr.exercise}</p>
                      <p className={styles.prMeta}>{pr.weight} kg × {pr.reps} reps</p>
                    </div>
                    <div className={styles.prRight}>
                      <p className={styles.pr1rm}>{pr.estimated1rm.toFixed(1)} kg</p>
                      <p className={styles.pr1rmLabel}>est. 1RM</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
