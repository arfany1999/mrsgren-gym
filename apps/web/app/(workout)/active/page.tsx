"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
import { getActiveWorkoutId, getRestTimer, setRestTimer } from "@/lib/storage";
import { getProfile } from "@/lib/gymProfile";
import {
  REST_BY_TYPE,
  ensureNotificationPermission,
  alertRestDone,
  unlockAudio,
} from "@/lib/restTimer";
import { subscribeQueue } from "@/lib/offlineQueue";
import type { ActiveSet } from "@/contexts/WorkoutContext";
import type { SetType } from "@/types/api";
import styles from "./page.module.css";

export default function ActiveWorkoutPage() {
  const router  = useRouter();
  const { user, supabase, profile } = useAuth();
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
  // Rest timer is stored as an absolute end-timestamp so the countdown stays
  // accurate even if the phone is locked, the app is swiped away, or the tab
  // is reloaded. `restSecs` / `restTotal` are derived for display only.
  const [restEndsAt,  setRestEndsAt]  = useState<number | null>(null);
  const [restTotal,   setRestTotal]   = useState(0);
  const [restSecs,    setRestSecs]    = useState(-1);
  const [restExerciseName, setRestExerciseName] = useState<string | undefined>(undefined);
  const restFiredRef  = useRef(false);
  const [pendingSync, setPendingSync] = useState(0);
  const [isOnline,    setIsOnline]    = useState(true);

  // Rehydrate the rest timer from localStorage on mount so a phone-lock or
  // a full reload doesn't lose the countdown. If the timer already finished
  // while we were away, drop it — the user has clearly moved on.
  useEffect(() => {
    const saved = getRestTimer();
    if (!saved) return;
    if (saved.endsAt <= Date.now()) {
      setRestTimer(null);
      return;
    }
    restFiredRef.current = !!saved.alerted;
    setRestTotal(saved.totalSecs);
    setRestEndsAt(saved.endsAt);
    setRestExerciseName(saved.exerciseName);
    setRestSecs(Math.max(0, Math.ceil((saved.endsAt - Date.now()) / 1000)));
  }, []);

  useEffect(() => subscribeQueue(setPendingSync), []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => setIsOnline(navigator.onLine);
    update();
    window.addEventListener("online",  update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online",  update);
      window.removeEventListener("offline", update);
    };
  }, []);

  // Report state
  const [report, setReport] = useState<{ workoutId: string; durationMins: number; dayNumber: number; workoutDays: number } | null>(null);
  const startedAtRef = useRef<string | null>(null);
  const workoutTitleRef = useRef<string>("");
  const workoutExercisesRef = useRef(exercises);

  // Track when workout started and save title/exercises for report
  useEffect(() => {
    if (activeWorkout?.startedAt && !startedAtRef.current) {
      startedAtRef.current = activeWorkout.startedAt;
    }
    if (activeWorkout?.title) workoutTitleRef.current = activeWorkout.title;
  }, [activeWorkout?.startedAt, activeWorkout?.title]);

  // Keep exercises ref up to date for report
  useEffect(() => {
    if (exercises.length > 0) workoutExercisesRef.current = exercises;
  }, [exercises]);

  // Rest timer countdown — drives the displayed seconds from the absolute
  // `restEndsAt` timestamp on every tick, so a phone lock / app-switch
  // pause that freezes the JS timer never lets the timer drift. When we
  // come back into focus (visibilitychange) we recompute immediately.
  // Fires the "rest done" cue exactly once when we cross 0.
  useEffect(() => {
    if (restEndsAt == null) {
      setRestSecs(-1);
      return;
    }
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      const remainingMs = restEndsAt - Date.now();
      const secs = Math.max(0, Math.ceil(remainingMs / 1000));
      setRestSecs(secs);
      if (remainingMs <= 0 && !restFiredRef.current) {
        restFiredRef.current = true;
        // Persist that we already played the cue so a quick remount (e.g.
        // resume from background after the timer expired) doesn't replay it.
        const saved = getRestTimer();
        if (saved) setRestTimer({ ...saved, alerted: true });
        alertRestDone(restExerciseName);
      }
    };
    tick();
    const id = window.setInterval(tick, 250);
    const onVis = () => { if (!document.hidden) tick(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [restEndsAt, restExerciseName]);

  const permAskedRef = useRef(false);
  const startRest = useCallback((setType: SetType = "normal", exerciseName?: string) => {
    const secs = REST_BY_TYPE[setType] ?? 90;
    const endsAt = Date.now() + secs * 1000;
    restFiredRef.current = false;
    setRestTotal(secs);
    setRestEndsAt(endsAt);
    setRestSecs(secs);
    setRestExerciseName(exerciseName);
    setRestTimer({ endsAt, totalSecs: secs, exerciseName, alerted: false });
    // Unlock audio + ask for notification permission ONCE (we're inside a user gesture)
    unlockAudio();
    if (!permAskedRef.current) {
      permAskedRef.current = true;
      void ensureNotificationPermission();
    }
  }, []);

  const adjustRest = useCallback((delta: number) => {
    setRestEndsAt((curEndsAt) => {
      if (curEndsAt == null) return curEndsAt;
      const next = Math.max(Date.now() + 1000, curEndsAt + delta * 1000);
      const saved = getRestTimer();
      const totalSecs = Math.max(saved?.totalSecs ?? 0, Math.ceil((next - Date.now()) / 1000));
      setRestTimer({
        endsAt: next,
        totalSecs,
        exerciseName: saved?.exerciseName,
        alerted: delta > 0 ? false : saved?.alerted,
      });
      return next;
    });
    setRestTotal((t) => Math.max(1, t + delta));
    if (delta > 0) restFiredRef.current = false;
  }, []);

  const skipRest = useCallback(() => {
    setRestEndsAt(null);
    setRestSecs(-1);
    setRestTotal(0);
    restFiredRef.current = false;
    setRestTimer(null);
  }, []);

  const formatRest = (s: number) => {
    if (s <= 0) return "0:00";
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, "0")}`;
  };

  const restProgress = restTotal > 0 ? Math.max(0, Math.min(1, 1 - (restSecs / restTotal))) : 0;

  useEffect(() => {
    if (!activeWorkout && !getActiveWorkoutId() && !finishing && !done && !discarding) {
      router.replace("/");
    }
  }, [activeWorkout, router, finishing, done, discarding]);

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

  if (!activeWorkout && !report) return null;

  async function handleFinish() {
    setFinishing(true);
    setRestTimer(null);
    try {
      // Calculate duration before finishing
      const startedAt = startedAtRef.current ?? activeWorkout!.startedAt;
      const durationMins = startedAt
        ? (Date.now() - new Date(startedAt).getTime()) / 60_000
        : 30;

      const id = await finishWorkout();
      if (id) {
        // Count total completed workouts + unique training days (this one is saved by finishWorkout)
        let dayNumber = 1;
        let workoutDays = 1;
        try {
          const [{ count }, { data: startedRows }] = await Promise.all([
            supabase
              .from("workouts")
              .select("id", { count: "exact", head: true })
              .not("finished_at", "is", null),
            supabase
              .from("workouts")
              .select("started_at")
              .not("finished_at", "is", null),
          ]);
          dayNumber = Math.max(count ?? 1, 1);
          const dayKeys = new Set<string>();
          (startedRows ?? []).forEach((r) => {
            const d = new Date((r as { started_at: string }).started_at);
            dayKeys.add(`${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`);
          });
          workoutDays = Math.max(dayKeys.size, 1);
        } catch { /* fallback to 1 */ }

        setDone(true);
        setReport({ workoutId: id, durationMins: Math.max(durationMins, 1), dayNumber, workoutDays });
      } else {
        router.replace("/");
      }
    } finally {
      setFinishing(false);
    }
  }

  async function handleDiscard() {
    setDiscarding(true);
    setRestTimer(null);
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
        title={workoutTitleRef.current || activeWorkout?.title || "Workout"}
        exercises={workoutExercisesRef.current.length > 0 ? workoutExercisesRef.current : exercises}
        durationMins={report.durationMins}
        dayNumber={report.dayNumber}
        workoutDays={report.workoutDays}
        weightKg={userWeightKg}
        userEmail={user?.email ?? null}
        userName={profile?.name ?? null}
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
          <span className={styles.workoutName}>{activeWorkout?.title}</span>
          <WorkoutTimer />
        </div>
        <Button variant="primary" size="sm" onClick={handleFinish} loading={finishing}>
          Finish
        </Button>
      </div>

      {/* Pending sync pill (or offline indicator) */}
      {(pendingSync > 0 || !isOnline) && (
        <div className={styles.syncPill}>
          <span className={styles.syncDot} />
          {!isOnline
            ? (pendingSync > 0
                ? `Offline — ${pendingSync} saved locally`
                : "Offline — your sets are safe")
            : `Syncing ${pendingSync} ${pendingSync === 1 ? "change" : "changes"}…`}
        </div>
      )}

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

      {/* Rest Timer Banner */}
      {restSecs > 0 && (
        <div className={styles.restBanner}>
          <span className={styles.restBarFill} style={{ width: `${restProgress * 100}%` }} />
          <span className={styles.restTime}>{formatRest(restSecs)}</span>
          <span className={styles.restLabel}>
            Rest{restExerciseName ? ` · ${restExerciseName}` : ""}
          </span>
          <button
            className={styles.restAdjust}
            onClick={() => adjustRest(-15)}
            type="button"
            aria-label="Subtract 15 seconds"
          >−15s</button>
          <button
            className={styles.restAdjust}
            onClick={() => adjustRest(15)}
            type="button"
            aria-label="Add 15 seconds"
          >+15s</button>
          <button className={styles.restSkip} onClick={skipRest} type="button">Skip</button>
        </div>
      )}

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
              onSaveSet={async (idx) => {
                const st = ex.sets[idx]?.setType ?? "normal";
                await saveSet(ex.weId, idx);
                startRest(st, ex.name);
              }}
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
