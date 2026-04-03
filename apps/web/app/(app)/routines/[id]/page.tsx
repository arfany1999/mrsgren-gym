"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkout } from "@/contexts/WorkoutContext";
import { TopBar } from "@/components/layout/TopBar/TopBar";
import { Button } from "@/components/ui/Button/Button";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import type { Routine } from "@/types/api";
import styles from "./page.module.css";

// Muscle group → accent color
const MUSCLE_COLORS: Record<string, string> = {
  chest: "#e05c5c",
  back: "#3a9bdc",
  shoulders: "#9b7fe8",
  biceps: "#e8a23a",
  triceps: "#e87a3a",
  legs: "#4caf7d",
  quads: "#4caf7d",
  hamstrings: "#4caf7d",
  glutes: "#4caf7d",
  calves: "#4caf7d",
  abs: "#f5c518",
  core: "#f5c518",
  cardio: "#34d399",
  forearms: "#e8a23a",
  traps: "#3a9bdc",
  lats: "#3a9bdc",
};

function getMuscleColor(muscles: string[]): string {
  if (!muscles.length) return "#5e6272";
  const key = (muscles[0] ?? "").toLowerCase();
  return MUSCLE_COLORS[key] ?? "#5e6272";
}

function getMuscleAbbr(muscles: string[]): string {
  if (!muscles.length) return "?";
  return (muscles[0] ?? "??").substring(0, 2).toUpperCase();
}

// All unique muscle groups across exercises
function getAllMuscles(routine: Routine): string[] {
  const seen = new Set<string>();
  routine.routineExercises.forEach((re) => {
    re.exercise.muscleGroups.forEach((m) => seen.add(m.toLowerCase()));
  });
  return Array.from(seen);
}

export default function RoutineDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { supabase } = useAuth();
  const { startWorkout } = useWorkout();
  const router = useRouter();

  const [routine, setRoutine] = useState<Routine | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  async function reload() {
    try {
      const { data, error } = await supabase
        .from("routines")
        .select("*, routine_exercises(*, exercises(*))")
        .eq("id", id)
        .single();
      if (error || !data) {
        router.replace("/routines");
        return;
      }
      setRoutine(mapRoutine(data));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { reload(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleStart() {
    setStarting(true);
    try {
      await startWorkout(id);
      router.push("/active");
    } finally {
      setStarting(false);
    }
  }

  if (loading) return <div className={styles.loading}><Spinner size={32} /></div>;
  if (!routine) return null;

  const totalSets = routine.routineExercises.reduce((s, re) => s + re.setsConfig.length, 0);
  const allMuscles = getAllMuscles(routine);
  // Est. duration: ~3 min per set
  const estMins = Math.round(totalSets * 3);

  return (
    <div className={styles.page}>
      <TopBar title={routine.title} showBack />

      <div className={styles.content}>
        {/* Action buttons */}
        <div className={styles.actions}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.push(`/routines/${id}/edit`)}
          >
            Edit Routine
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleStart}
            loading={starting}
          >
            Start Routine
          </Button>
        </div>

        {routine.description && (
          <p className={styles.desc}>{routine.description}</p>
        )}

        {/* Routine Summary */}
        <div className={styles.summary}>
          <h3 className={styles.summaryTitle}>Routine Summary</h3>
          <div className={styles.summaryStats}>
            <div className={styles.summaryStat}>
              <span className={styles.summaryVal}>{routine.routineExercises.length}</span>
              <span className={styles.summaryLbl}>Exercises</span>
            </div>
            <div className={styles.summaryDivider} />
            <div className={styles.summaryStat}>
              <span className={styles.summaryVal}>{totalSets}</span>
              <span className={styles.summaryLbl}>Total Sets</span>
            </div>
            <div className={styles.summaryDivider} />
            <div className={styles.summaryStat}>
              <span className={styles.summaryVal}>{estMins > 0 ? `${estMins}min` : "—"}</span>
              <span className={styles.summaryLbl}>Est. Duration</span>
            </div>
          </div>

          {/* Muscle breakdown */}
          {allMuscles.length > 0 && (
            <div className={styles.muscleBreakdown}>
              {allMuscles.slice(0, 6).map((m) => {
                const count = routine.routineExercises.filter((re) =>
                  re.exercise.muscleGroups.map((g) => g.toLowerCase()).includes(m)
                ).length;
                const pct = Math.round((count / routine.routineExercises.length) * 100);
                return (
                  <div key={m} className={styles.muscleRow}>
                    <span className={styles.muscleName}>{m}</span>
                    <div className={styles.muscleBarWrap}>
                      <div
                        className={styles.muscleBar}
                        style={{ width: `${pct}%`, background: getMuscleColor([m]) }}
                      />
                    </div>
                    <span className={styles.musclePct}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Exercise list */}
        <div className={styles.exerciseList}>
          {routine.routineExercises.length === 0 ? (
            <p className={styles.noEx}>No exercises yet. Edit the routine to add exercises.</p>
          ) : (
            routine.routineExercises.map((re) => {
              const color = getMuscleColor(re.exercise.muscleGroups);
              const abbr = getMuscleAbbr(re.exercise.muscleGroups);
              const sets = re.setsConfig.length;
              return (
                <div key={re.id} className={styles.exRow}>
                  <div className={styles.exIcon} style={{ background: `${color}22`, border: `1.5px solid ${color}55` }}>
                    <span style={{ color, fontWeight: 700, fontSize: 12 }}>{abbr}</span>
                  </div>
                  <div className={styles.exInfo}>
                    <p className={styles.exName}>{re.exercise.name}</p>
                    <p className={styles.exMeta}>
                      {sets > 0 ? `${sets} set${sets !== 1 ? "s" : ""}` : "—"}
                      {re.exercise.muscleGroups.length > 0 && (
                        <span className={styles.exMuscles}> · {re.exercise.muscleGroups.join(", ")}</span>
                      )}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Start button (bottom) */}
        <Button fullWidth size="lg" onClick={handleStart} loading={starting}>
          Start Workout
        </Button>
      </div>
    </div>
  );
}

function mapRoutine(row: Record<string, unknown>): Routine {
  const res = (row.routine_exercises as Record<string, unknown>[]) ?? [];
  return {
    id: row.id as string,
    userId: (row.user_id as string) ?? null,
    title: ((row.title as string) ?? (row.name as string) ?? "Routine"),
    description: (row.description as string) ?? null,
    folderId: (row.folder_id as string) ?? null,
    isPublic: (row.is_public as boolean) ?? false,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    folder: null,
    routineExercises: res
      .slice()
      .sort((a, b) => ((a.order_index ?? a.order ?? 0) as number) - ((b.order_index ?? b.order ?? 0) as number))
      .map((re) => {
        const ex = (re.exercises as Record<string, unknown>) ?? {};
        const setsCount = (re.sets as number) ?? 3;
        const setsConfig = Array.isArray(re.sets_config)
          ? re.sets_config
          : Array.from({ length: setsCount }, () => ({ setType: "normal" as const, reps: null, weightKg: null }));
        return {
          id: re.id as string,
          routineId: re.routine_id as string,
          exerciseId: re.exercise_id as string,
          order: (re.order_index ?? re.order) as number,
          setsConfig,
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
        };
      }),
  };
}
