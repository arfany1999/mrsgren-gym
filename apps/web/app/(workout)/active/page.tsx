"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useWorkout } from "@/contexts/WorkoutContext";
import { ExerciseBlock } from "@/components/workout/ExerciseBlock/ExerciseBlock";
import { ExercisePicker } from "@/components/workout/ExercisePicker/ExercisePicker";
import { WorkoutTimer } from "@/components/workout/WorkoutTimer/WorkoutTimer";
import { PRBanner } from "@/components/workout/PRBanner/PRBanner";
import { WorkoutReport } from "@/components/workout/WorkoutReport/WorkoutReport";
import { Modal } from "@/components/ui/Modal/Modal";
import { Button } from "@/components/ui/Button/Button";
import { getActiveWorkoutId } from "@/lib/storage";
import type { ActiveSet, ActiveExercise } from "@/contexts/WorkoutContext";
import type { SetType } from "@/types/api";
import styles from "./page.module.css";

const REST_SECONDS = 90;

export default function ActiveWorkoutPage() {
  const router = useRouter();
  const {
    activeWorkout,
    exercises,
    elapsedSeconds,
    addExercise,
    removeExercise,
    addSet,
    updateSetField,
    saveSet,
    deleteSet,
    finishWorkout,
    discardWorkout,
    updateTitle,
  } = useWorkout();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [finishing, setFinishing] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [report, setReport] = useState<{ id: string; title: string; secs: number; exercises: ActiveExercise[] } | null>(null);

  // Rest timer
  const [restLeft, setRestLeft] = useState(0);
  const restRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRest = useCallback(() => {
    if (restRef.current) clearInterval(restRef.current);
    setRestLeft(REST_SECONDS);
    restRef.current = setInterval(() => {
      setRestLeft((s) => {
        if (s <= 1) {
          clearInterval(restRef.current!);
          restRef.current = null;
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, []);

  const stopRest = useCallback(() => {
    if (restRef.current) { clearInterval(restRef.current); restRef.current = null; }
    setRestLeft(0);
  }, []);

  useEffect(() => () => { if (restRef.current) clearInterval(restRef.current); }, []);

  useEffect(() => {
    if (!activeWorkout && !getActiveWorkoutId()) {
      router.replace("/");
    }
  }, [activeWorkout, router]);

  if (!activeWorkout) return null;

  // Live stats
  const totalSets = exercises.reduce((sum, e) => sum + e.sets.filter((s) => s.isSaved).length, 0);
  const totalVolume = exercises.reduce((sum, e) =>
    sum + e.sets.filter((s) => s.isSaved).reduce((v, s) => v + (parseFloat(s.weightKg) || 0) * (parseInt(s.reps) || 0), 0), 0
  );

  async function handleFinish() {
    setFinishing(true);
    stopRest();
    const summaryTitle = activeWorkout?.title ?? "Workout";
    const summaryExercises = [...exercises];
    const summarySecs = elapsedSeconds;
    try {
      const id = await finishWorkout();
      setFinishOpen(false);
      if (id) {
        setReport({ id, title: summaryTitle, secs: summarySecs, exercises: summaryExercises });
      } else {
        router.replace("/");
      }
    } finally {
      setFinishing(false);
    }
  }

  async function handleDiscard() {
    setDiscarding(true);
    stopRest();
    try {
      await discardWorkout();
    } finally {
      setDiscarding(false);
      setDiscardOpen(false);
    }
  }

  function handleTitleBlur() {
    setEditingTitle(false);
    const title = titleDraft.trim() || "Workout";
    updateTitle(title);
  }

  async function handleSaveSet(weId: string, idx: number) {
    await saveSet(weId, idx);
    startRest();
  }

  function fmtRest(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}:${String(sec).padStart(2, "0")}` : `0:${String(sec).padStart(2, "0")}`;
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
          {editingTitle ? (
            <input
              className={styles.titleInput}
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={(e) => e.key === "Enter" && handleTitleBlur()}
              autoFocus
            />
          ) : (
            <button
              className={styles.titleBtn}
              onClick={() => { setTitleDraft(activeWorkout.title); setEditingTitle(true); }}
              type="button"
            >
              {activeWorkout.title}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ marginLeft: 4 }}>
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
          <WorkoutTimer />
        </div>

        <Button variant="primary" size="sm" onClick={() => setFinishOpen(true)}>
          Finish
        </Button>
      </div>

      {/* Live Stats Bar */}
      <div className={styles.statsBar}>
        <div className={styles.statChip}>
          <span className={styles.chipVal}>{totalSets}</span>
          <span className={styles.chipLbl}>Sets</span>
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

      {/* Rest Timer Banner */}
      {restLeft > 0 && (
        <div className={styles.restBanner}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
            <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className={styles.restTime}>{fmtRest(restLeft)}</span>
          <span className={styles.restLabel}>Rest</span>
          <button type="button" className={styles.restSkip} onClick={stopRest}>Skip</button>
        </div>
      )}

      {/* Exercises */}
      <div className={styles.content}>
        {exercises.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyIcon}>🏋️</p>
            <p className={styles.emptyTitle}>No exercises yet</p>
            <p className={styles.emptyText}>Tap &ldquo;Add Exercise&rdquo; to start logging</p>
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
              onSaveSet={(idx) => handleSaveSet(ex.weId, idx)}
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
      </div>

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(exercise) => addExercise(exercise)}
      />

      {/* Finish Modal */}
      <Modal open={finishOpen} onClose={() => setFinishOpen(false)} title="Finish Workout?">
        <div className={styles.modalStats}>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{exercises.length}</span>
            <span className={styles.statLabel}>Exercises</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{totalSets}</span>
            <span className={styles.statLabel}>Sets logged</span>
          </div>
          {totalVolume > 0 && (
            <div className={styles.statItem}>
              <span className={styles.statValue}>{Math.round(totalVolume).toLocaleString()}</span>
              <span className={styles.statLabel}>kg volume</span>
            </div>
          )}
        </div>
        <div className={styles.modalActions}>
          <Button variant="secondary" onClick={() => setFinishOpen(false)} fullWidth>Keep Going</Button>
          <Button variant="primary" onClick={handleFinish} loading={finishing} fullWidth>Finish Workout</Button>
        </div>
      </Modal>

      {/* Discard Modal */}
      <Modal open={discardOpen} onClose={() => setDiscardOpen(false)} title="Discard Workout?">
        <p className={styles.modalText}>This workout will be permanently deleted. This cannot be undone.</p>
        <div className={styles.modalActions}>
          <Button variant="secondary" onClick={() => setDiscardOpen(false)} fullWidth>Cancel</Button>
          <Button variant="danger" onClick={handleDiscard} loading={discarding} fullWidth>Discard</Button>
        </div>
      </Modal>

      {/* Workout Report */}
      {report && (
        <WorkoutReport
          title={report.title}
          elapsedSeconds={report.secs}
          exercises={report.exercises}
          workoutId={report.id}
          onDone={(id) => router.replace(`/workouts/${id}`)}
        />
      )}
    </div>
  );
}
