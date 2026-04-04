"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkout } from "@/contexts/WorkoutContext";
import { ExerciseBlock } from "@/components/workout/ExerciseBlock/ExerciseBlock";
import { ExercisePicker } from "@/components/workout/ExercisePicker/ExercisePicker";
import { WorkoutTimer } from "@/components/workout/WorkoutTimer/WorkoutTimer";
import { PRBanner } from "@/components/workout/PRBanner/PRBanner";
import { WorkoutReport } from "@/components/workout/WorkoutReport/WorkoutReport";
import { Modal } from "@/components/ui/Modal/Modal";
import { Button } from "@/components/ui/Button/Button";
import { getActiveWorkoutId } from "@/lib/storage";
import { getProfile } from "@/lib/gymProfile";
import type { ActiveSet } from "@/contexts/WorkoutContext";
import type { SetType } from "@/types/api";
import styles from "./page.module.css";

export default function ActiveWorkoutPage() {
  const router  = useRouter();
  const { user, supabase } = useAuth();
  const {
    activeWorkout,
    exercises,
    addExercise,
    removeExercise,
    addSet,
    updateSetField,
    saveSet,
    deleteSet,
    finishWorkout,
    discardWorkout,
  } = useWorkout();

  const [pickerOpen,  setPickerOpen]  = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [finishing,   setFinishing]   = useState(false);
  const [discarding,  setDiscarding]  = useState(false);
  const [done,        setDone]        = useState(false);

  // Report state
  const [report, setReport] = useState<{ workoutId: string; durationMins: number; dayNumber: number } | null>(null);
  const startedAtRef = useRef<string | null>(null);

  // Track when workout started
  useEffect(() => {
    if (activeWorkout?.startedAt && !startedAtRef.current) {
      startedAtRef.current = activeWorkout.startedAt;
    }
  }, [activeWorkout?.startedAt]);

  useEffect(() => {
    if (!activeWorkout && !getActiveWorkoutId() && !finishing && !done) {
      router.replace("/");
    }
  }, [activeWorkout, router, finishing, done]);

  const totalSets = useMemo(
    () => exercises.reduce((sum, e) => sum + e.sets.filter(s => s.isSaved).length, 0),
    [exercises]
  );
  const totalVolume = useMemo(
    () => exercises.reduce((sum, e) =>
      sum + e.sets.filter(s => s.isSaved).reduce((v, s) =>
        v + (parseFloat(s.weightKg) || 0) * (parseInt(s.reps) || 0), 0), 0),
    [exercises]
  );

  if (!activeWorkout) return null;

  async function handleFinish() {
    setFinishing(true);
    try {
      // Calculate duration before finishing
      const startedAt = startedAtRef.current ?? activeWorkout!.startedAt;
      const durationMins = startedAt
        ? (Date.now() - new Date(startedAt).getTime()) / 60_000
        : 30;

      const id = await finishWorkout();
      if (id) {
        // Count total completed workouts (this one is already saved by finishWorkout)
        let dayNumber = 1;
        try {
          const { count } = await supabase
            .from("workouts")
            .select("id", { count: "exact", head: true })
            .not("finished_at", "is", null);
          dayNumber = Math.max(count ?? 1, 1);
        } catch { /* fallback to 1 */ }

        setDone(true);
        setReport({ workoutId: id, durationMins: Math.max(durationMins, 1), dayNumber });
      } else {
        router.replace("/");
      }
    } finally {
      setFinishing(false);
    }
  }

  async function handleDiscard() {
    setDiscarding(true);
    try {
      await discardWorkout();
    } finally {
      setDiscarding(false);
      setDiscardOpen(false);
    }
  }

  function handleReportDone(id: string) {
    router.replace(`/workouts/${id}?new=1`);
  }

  // User's body weight for calorie calc (fallback = 75 kg)
  const userWeightKg = (user?.email ? getProfile(user.email)?.weight_kg : null) ?? 75;

  // ── Show calorie report after finish ──────────────────────────
  if (report) {
    return (
      <WorkoutReport
        title={activeWorkout.title}
        exercises={exercises}
        durationMins={report.durationMins}
        dayNumber={report.dayNumber}
        weightKg={userWeightKg}
        userEmail={user?.email ?? null}
        workoutId={report.workoutId}
        onDone={handleReportDone}
      />
    );
  }

  return (
    <div className={styles.page}>
      <PRBanner />

      {/* Top Bar */}
      <div className={styles.topBar}>
        <button className={styles.discardBtn} onClick={() => setDiscardOpen(true)} type="button">
          Discard
        </button>
        <div className={styles.titleWrapper}>
          <span className={styles.workoutName}>{activeWorkout.title}</span>
          <WorkoutTimer />
        </div>
        <Button variant="primary" size="sm" onClick={handleFinish} loading={finishing}>
          Finish
        </Button>
      </div>

      {/* Live Stats Bar */}
      <div className={styles.statsBar}>
        <div className={styles.statChip}>
          <span className={styles.chipVal}>{totalSets}</span>
          <span className={styles.chipLbl}>Sets Done</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statChip}>
          <span className={styles.chipVal}>
            {totalVolume > 0 ? `${Math.round(totalVolume).toLocaleString()} kg` : "—"}
          </span>
          <span className={styles.chipLbl}>Volume</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statChip}>
          <span className={styles.chipVal}>{exercises.length}</span>
          <span className={styles.chipLbl}>Exercises</span>
        </div>
      </div>

      {/* Exercises */}
      <div className={styles.content}>
        {exercises.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyIcon}>🏋️</p>
            <p className={styles.emptyTitle}>No exercises yet</p>
            <p className={styles.emptyText}>Tap "Add Exercise" to start logging</p>
          </div>
        ) : (
          exercises.map((ex) => (
            <ExerciseBlock
              key={ex.weId}
              exercise={ex}
              onAddSet={() => addSet(ex.weId)}
              onUpdateField={(idx, field, value) =>
                updateSetField(ex.weId, idx, field as keyof ActiveSet, value as string | SetType | boolean | number)
              }
              onSaveSet={(idx) => saveSet(ex.weId, idx)}
              onDeleteSet={(setId) => deleteSet(ex.weId, setId)}
              onRemove={() => removeExercise(ex.weId)}
            />
          ))
        )}

        <button className={styles.addExerciseBtn} onClick={() => setPickerOpen(true)} type="button">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          Add Exercise
        </button>

        {exercises.length > 0 && (
          <div className={styles.bottomFinish}>
            <Button variant="primary" fullWidth size="lg" onClick={handleFinish} loading={finishing}>
              Finish Workout
            </Button>
          </div>
        )}
      </div>

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(exercise) => addExercise(exercise)}
      />

      {/* Discard Modal */}
      <Modal open={discardOpen} onClose={() => setDiscardOpen(false)} title="Discard Workout?">
        <p className={styles.modalText}>This workout will be permanently deleted. This cannot be undone.</p>
        <div className={styles.modalActions}>
          <Button variant="secondary" onClick={() => setDiscardOpen(false)} fullWidth>Cancel</Button>
          <Button variant="danger" onClick={handleDiscard} loading={discarding} fullWidth>Discard</Button>
        </div>
      </Modal>
    </div>
  );
}
