"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { TopBar } from "@/components/layout/TopBar/TopBar";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import { BodyMap } from "@/components/stats/BodyMap/BodyMap";
import { fetchMuscleVolume, muscleVolumeMap } from "@/lib/muscleVolume";
import styles from "./page.module.css";

interface PR {
  exerciseId: string;
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

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const W = 64, H = 22;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const lastPt = pts[pts.length - 1]!.split(",");
  const lastX = parseFloat(lastPt[0]!);
  const lastY = parseFloat(lastPt[1]!);
  return (
    <svg width={W} height={H} className={styles.sparkline} viewBox={`0 0 ${W} ${H}`}>
      <polyline
        points={pts.join(" ")}
        fill="none" stroke="var(--accent)" strokeWidth="1.6"
        strokeLinecap="round" strokeLinejoin="round" opacity="0.6"
      />
      <circle cx={lastX} cy={lastY} r="2.5" fill="var(--accent)" opacity="0.9" />
    </svg>
  );
}

export default function StatisticsPage() {
  const { supabase } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [prs, setPrs] = useState<PR[]>([]);
  const [sparklines, setSparklines] = useState<Map<string, number[]>>(new Map());
  const [muscleVol, setMuscleVol] = useState<Record<string, number>>({});
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
            .select("exercise_id, weight, reps, estimated_1rm, achieved_at, exercises(name)")
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

        const prList = (prsRes.data ?? []).map((r: Record<string, unknown>) => {
          const ex = r.exercises as Record<string, unknown> | null;
          return {
            exerciseId: r.exercise_id as string,
            exercise: (ex?.name as string) ?? "Unknown",
            weight: r.weight as number,
            reps: r.reps as number,
            estimated1rm: r.estimated_1rm as number,
            achievedAt: r.achieved_at as string,
          };
        });
        setPrs(prList);

        // ── Fetch sparkline history per exercise ─────────────────
        const exerciseIds = prList.map(p => p.exerciseId).filter(Boolean);
        if (exerciseIds.length > 0) {
          const { data: weData } = await supabase
            .from("workout_exercises")
            .select("id, exercise_id, workouts(started_at, finished_at)")
            .in("exercise_id", exerciseIds);

          const completedWEs = (weData ?? []).filter((we: Record<string, unknown>) => {
            const w = we.workouts as Record<string, unknown> | null;
            return w?.finished_at != null;
          });

          const weIds = completedWEs.map((we: Record<string, unknown>) => we.id as string);
          if (weIds.length > 0) {
            const { data: setsData } = await supabase
              .from("workout_sets")
              .select("workout_exercise_id, weight, reps")
              .in("workout_exercise_id", weIds)
              .gt("weight", 0);

            // Build per-exercise sparkline: date -> max e1rm
            const sparkMap = new Map<string, Map<string, number>>();
            for (const we of completedWEs as Record<string, unknown>[]) {
              const w = we.workouts as Record<string, unknown>;
              const exId = we.exercise_id as string;
              const date = (w.started_at as string).slice(0, 10);
              const sets = (setsData ?? []).filter(
                (s: Record<string, unknown>) => s.workout_exercise_id === we.id
              );
              if (sets.length === 0) continue;
              const maxE1rm = Math.max(...sets.map((s: Record<string, unknown>) => {
                const wt = (s.weight as number) ?? 0;
                const r = (s.reps as number) ?? 0;
                return r > 0 ? wt * (1 + r / 30) : wt;
              }));
              if (!sparkMap.has(exId)) sparkMap.set(exId, new Map());
              const cur = sparkMap.get(exId)!.get(date) ?? 0;
              if (maxE1rm > cur) sparkMap.get(exId)!.set(date, maxE1rm);
            }

            const result = new Map<string, number[]>();
            sparkMap.forEach((dateMap, exId) => {
              const sorted = [...dateMap.entries()]
                .sort((a, b) => a[0].localeCompare(b[0]))
                .slice(-8)
                .map(([, v]) => v);
              result.set(exId, sorted);
            });
            setSparklines(result);
          }
        }
      } finally {
        setLoading(false);
      }
    }
    load();
    // 30-day muscle volume powers the BodyMap. Failing fetch ⇒ empty map ⇒
    // BodyMap renders an unhighlighted figure rather than blocking the page.
    fetchMuscleVolume(supabase, 30).then((rows) => setMuscleVol(muscleVolumeMap(rows)));
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
            <h2 className={styles.sectionTitle}>30-Day Muscle Volume</h2>
            <BodyMap volumeByMuscle={muscleVol} />
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Personal Records</h2>
            {prs.length === 0 ? (
              <p className={styles.empty}>No personal records yet. Complete workouts to track PRs.</p>
            ) : (
              <div className={styles.prList}>
                {prs.map((pr, i) => (
                  <div key={i} className={styles.prCard} style={{ animationDelay: `${i * 40}ms` }}>
                    <div className={styles.prLeft}>
                      <p className={styles.prExercise}>{pr.exercise}</p>
                      <p className={styles.prMeta}>{pr.weight} kg × {pr.reps} reps</p>
                      <Sparkline values={sparklines.get(pr.exerciseId) ?? []} />
                    </div>
                    <div className={styles.prRight}>
                      <p className={styles.pr1rm}>{pr.estimated1rm.toFixed(1)}</p>
                      <p className={styles.pr1rmLabel}>est. 1RM kg</p>
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
