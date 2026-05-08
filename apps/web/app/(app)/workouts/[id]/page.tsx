"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { TopBar } from "@/components/layout/TopBar/TopBar";
import { Button } from "@/components/ui/Button/Button";
import { Modal } from "@/components/ui/Modal/Modal";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import type { Workout, SetType } from "@/types/api";
import { formatDateFull, formatTime, workoutDuration, calcVolume, parseMuscleGroup } from "@/lib/formatters";
import { estimate1RM } from "@/lib/exerciseHistory";
import styles from "./page.module.css";

// Pull the user's lifetime best weight per exercise (from their other
// completed workouts, NOT this one) so we can flag any set that beats
// it as a PR with a small gold dot. Best-weight is the simplest signal
// most lifters parse instantly; multi-category PR detection lives in
// the live workout flow already.
async function fetchLifetimeBestWeights(
  supabase: ReturnType<typeof useAuth>["supabase"],
  userId: string,
  exerciseIds: string[],
  excludeWorkoutId: string,
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (exerciseIds.length === 0) return out;
  const { data } = await supabase
    .from("workout_sets")
    .select(
      "weight, workout_exercises!inner(exercise_id, " +
      "workouts!inner(id, user_id, finished_at))",
    )
    .in("workout_exercises.exercise_id", exerciseIds)
    .eq("workout_exercises.workouts.user_id", userId)
    .not("workout_exercises.workouts.finished_at", "is", null)
    .neq("workout_exercises.workouts.id", excludeWorkoutId)
    .gt("weight", 0);
  for (const r of (data ?? []) as unknown as Array<{
    weight: number | null;
    workout_exercises: { exercise_id: string } | null;
  }>) {
    const exId = r.workout_exercises?.exercise_id;
    const w = r.weight ?? 0;
    if (!exId || w <= 0) continue;
    const cur = out.get(exId) ?? 0;
    if (w > cur) out.set(exId, w);
  }
  return out;
}

// Pull each exercise's most recent prior session's top-set volume so we
// can show a "vs last session" delta on the per-exercise block.
async function fetchPrevSessionVolumes(
  supabase: ReturnType<typeof useAuth>["supabase"],
  userId: string,
  exerciseIds: string[],
  excludeWorkoutId: string,
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (exerciseIds.length === 0) return out;
  const { data } = await supabase
    .from("workout_sets")
    .select(
      "reps, weight, workout_exercises!inner(exercise_id, " +
      "workouts!inner(id, user_id, started_at, finished_at))",
    )
    .in("workout_exercises.exercise_id", exerciseIds)
    .eq("workout_exercises.workouts.user_id", userId)
    .not("workout_exercises.workouts.finished_at", "is", null)
    .neq("workout_exercises.workouts.id", excludeWorkoutId);

  // Group sets by (exerciseId, workoutId), pick the most-recent workout
  // per exercise, sum its volume.
  const byExercise = new Map<string, Map<string, { date: string; volume: number }>>();
  for (const r of (data ?? []) as unknown as Array<{
    reps: number | null;
    weight: number | null;
    workout_exercises: {
      exercise_id: string;
      workouts: { id: string; started_at: string } | null;
    } | null;
  }>) {
    const exId = r.workout_exercises?.exercise_id;
    const w = r.workout_exercises?.workouts;
    if (!exId || !w?.id) continue;
    const reps = r.reps ?? 0;
    const weight = r.weight ?? 0;
    const vol = reps * weight;
    let exMap = byExercise.get(exId);
    if (!exMap) { exMap = new Map(); byExercise.set(exId, exMap); }
    let session = exMap.get(w.id);
    if (!session) { session = { date: w.started_at, volume: 0 }; exMap.set(w.id, session); }
    session.volume += vol;
  }
  for (const [exId, sessions] of byExercise) {
    const sorted = Array.from(sessions.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    const latest = sorted[0];
    if (latest && latest.volume > 0) out.set(exId, latest.volume);
  }
  return out;
}

export default function WorkoutDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { supabase, profile, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showReport, setShowReport] = useState(false);
  // PR + delta context loaded lazily after the workout itself.
  const [bestWeights, setBestWeights] = useState<Map<string, number>>(new Map());
  const [prevVolumes, setPrevVolumes] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    if (searchParams.get("new") === "1") setShowReport(true);
  }, [searchParams]);

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase
          .from("workouts")
          .select("*, workout_exercises(*, exercises(*), workout_sets(*))")
          .eq("id", id)
          .single();
        if (error || !data) {
          router.replace("/workouts");
          return;
        }
        const mapped = mapWorkout(data);
        setWorkout(mapped);

        // Best-weight + prev-session-volume lookups in parallel after
        // the page paints. Failures are silent (PR badges and delta
        // chips just don't render) — the rest of the page still works.
        if (user?.id) {
          const exIds = mapped.workoutExercises.map((we) => we.exerciseId).filter(Boolean);
          void Promise.all([
            fetchLifetimeBestWeights(supabase, user.id, exIds, mapped.id),
            fetchPrevSessionVolumes(supabase, user.id, exIds, mapped.id),
          ]).then(([bw, pv]) => {
            setBestWeights(bw);
            setPrevVolumes(pv);
          }).catch(() => {});
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, supabase, router, user?.id]);

  async function handleDelete() {
    setDeleting(true);
    try {
      await supabase.from("workouts").delete().eq("id", id);
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
          {workout.workoutExercises.map((we) => {
            // Per-exercise volume in this session for the delta chip.
            const thisVolume = we.sets.reduce(
              (s, set) => s + ((set.weightKg ?? 0) * (set.reps ?? 0)),
              0,
            );
            const prevVolume = prevVolumes.get(we.exerciseId) ?? 0;
            const delta =
              prevVolume > 0 && thisVolume > 0
                ? Math.round(((thisVolume - prevVolume) / prevVolume) * 100)
                : null;
            const lifetimeBest = bestWeights.get(we.exerciseId) ?? 0;
            return (
              <div key={we.id} className={styles.exerciseBlock}>
                {/* Tappable exercise header → drills into the per-exercise
                    progression view (Phase 5). */}
                <Link
                  href={`/exercises/${encodeURIComponent(we.exercise.name)}`}
                  className={styles.exNameLink}
                >
                  <h3 className={styles.exName}>{we.exercise.name}</h3>
                </Link>
                <div className={styles.exMetaRow}>
                  {we.exercise.muscleGroups.length > 0 && (
                    <p className={styles.exMuscles}>{we.exercise.muscleGroups.join(", ")}</p>
                  )}
                  {delta !== null && delta !== 0 && (
                    <span
                      className={[
                        styles.deltaChip,
                        delta > 0 ? styles.deltaUp : styles.deltaDown,
                      ].join(" ")}
                      title={`Volume vs last session: ${prevVolume.toLocaleString()} kg → ${thisVolume.toLocaleString()} kg`}
                    >
                      {delta > 0 ? "▲" : "▼"} {Math.abs(delta)}% vol
                    </span>
                  )}
                </div>
                <div className={styles.setsTable}>
                  <div className={styles.setsHeader}>
                    <span>SET</span>
                    <span>WEIGHT &amp; REPS</span>
                    <span>1RM</span>
                  </div>
                  {we.sets.map((s, i) => {
                    const weightReps = s.weightKg != null && s.reps != null
                      ? `${s.weightKg}kg × ${s.reps} reps`
                      : s.weightKg != null
                      ? `${s.weightKg}kg`
                      : s.reps != null
                      ? `${s.reps} reps`
                      : "—";
                    const e1 =
                      s.weightKg != null && s.reps != null && s.weightKg > 0 && s.reps > 0
                        ? estimate1RM(s.weightKg, s.reps)
                        : 0;
                    // PR if this set's weight beats the user's best
                    // weight on this exercise from any OTHER session.
                    const isPr = lifetimeBest > 0 && (s.weightKg ?? 0) > lifetimeBest;
                    return (
                      <div key={s.id} className={styles.setRow}>
                        <span className={styles.setNum}>{i + 1}</span>
                        <span className={styles.setWeightReps}>
                          {weightReps}
                          {isPr && (
                            <span className={styles.prDot} title="Personal record on this set" aria-label="PR">
                              🏆
                            </span>
                          )}
                          {s.setType !== "normal" && (
                            <span className={[styles.setType, styles[s.setType]].join(" ")}>
                              {(s.setType[0] ?? "").toUpperCase()}
                            </span>
                          )}
                        </span>
                        <span className={styles.setE1rm}>
                          {e1 > 0 ? `${e1.toFixed(1)}kg` : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Workout Report Overlay */}
      {showReport && workout && (
        <div className={styles.reportOverlay}>
          <div className={styles.reportCard}>
            <div className={styles.reportEmoji}>🏆</div>
            <h2 className={styles.reportTitle}>Well Done G!</h2>
            {profile?.name && <p className={styles.reportName}>{profile.name}</p>}
            <p className={styles.reportSub}>{workout.title}</p>

            <div className={styles.reportStats}>
              {isFinished && (
                <div className={styles.reportStat}>
                  <span className={styles.reportStatVal}>{duration}</span>
                  <span className={styles.reportStatLbl}>Duration</span>
                </div>
              )}
              <div className={styles.reportStat}>
                <span className={styles.reportStatVal}>{allSets.length}</span>
                <span className={styles.reportStatLbl}>Sets Done</span>
              </div>
              <div className={styles.reportStat}>
                <span className={styles.reportStatVal}>{workout.workoutExercises.length}</span>
                <span className={styles.reportStatLbl}>Exercises</span>
              </div>
              <div className={styles.reportStat}>
                <span className={styles.reportStatVal}>
                  {volume > 0 ? `${Math.round(volume).toLocaleString()} kg` : "—"}
                </span>
                <span className={styles.reportStatLbl}>Volume Lifted</span>
              </div>
            </div>

            <Button
              variant="primary"
              fullWidth
              size="lg"
              onClick={() => {
                setShowReport(false);
                router.replace(`/workouts/${id}`);
              }}
            >
              See Full Report
            </Button>
          </div>
        </div>
      )}

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
        sets: sets
          .filter((s) => (s.is_completed as boolean) !== false)
          .map((s) => ({
            id: s.id as string,
            workoutExerciseId: s.workout_exercise_id as string,
            reps: (s.reps as number) ?? null,
            weightKg: (s.weight as number) ?? null,
            setType: (s.set_type as SetType) ?? "normal",
            rpe: (s.rpe as number) ?? null,
            createdAt: "",
          })),
      };
    }),
  };
}
