"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkout } from "@/contexts/WorkoutContext";
import { ExerciseBlock } from "@/components/workout/ExerciseBlock/ExerciseBlock";
import { CircularTimer } from "@/components/workout/CircularTimer/CircularTimer";
import { PRBanner } from "@/components/workout/PRBanner/PRBanner";
import { Modal } from "@/components/ui/Modal/Modal";

const ExercisePicker = dynamic(
  () => import("@/components/workout/ExercisePicker/ExercisePicker").then((m) => m.ExercisePicker),
  { ssr: false },
);
const RestOverlay = dynamic(
  () => import("@/components/workout/RestOverlay/RestOverlay").then((m) => m.RestOverlay),
  { ssr: false },
);
const WorkoutReport = dynamic(
  () => import("@/components/workout/WorkoutReport/WorkoutReport").then((m) => m.WorkoutReport),
  { ssr: false },
);
import { Button } from "@/components/ui/Button/Button";
import { getActiveWorkoutId, getRestTimer, setRestTimer } from "@/lib/storage";
import { getProfile } from "@/lib/gymProfile";
import {
  smartRestSeconds,
  ensureNotificationPermission,
  alertRestDone,
  unlockAudio,
} from "@/lib/restTimer";
import { subscribeQueue } from "@/lib/offlineQueue";
import { haptic } from "@/lib/haptics";
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
  const [restOverlayOpen, setRestOverlayOpen] = useState(false);
  const [elapsed,     setElapsed]     = useState(0);
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

  // Elapsed workout time
  useEffect(() => {
    if (!activeWorkout?.startedAt) { setElapsed(0); return; }
    const startedAtMs = new Date(activeWorkout.startedAt).getTime();
    const recompute = () => setElapsed(Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000)));
    recompute();
    const id = window.setInterval(recompute, 1000);
    const onVis = () => { if (!document.hidden) recompute(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", recompute);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", recompute);
    };
  }, [activeWorkout?.startedAt]);

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
  const startRest = useCallback((setType: SetType = "normal", exerciseName?: string, muscleGroup?: string, weightKg?: number) => {
    const secs = smartRestSeconds(setType, exerciseName, muscleGroup, weightKg);
    const endsAt = Date.now() + secs * 1000;
    restFiredRef.current = false;
    setRestTotal(secs);
    setRestEndsAt(endsAt);
    setRestSecs(secs);
    setRestExerciseName(exerciseName);
    setRestTimer({ endsAt, totalSecs: secs, exerciseName, alerted: false });
    setRestOverlayOpen(true);
    // Unlock audio + ask for notification permission ONCE (we're inside a user gesture)
    unlockAudio();
    if (!permAskedRef.current) {
      permAskedRef.current = true;
      void ensureNotificationPermission();
    }
  }, []);

  const startRestPreset = useCallback((secs: number) => {
    const endsAt = Date.now() + secs * 1000;
    restFiredRef.current = false;
    setRestTotal(secs);
    setRestEndsAt(endsAt);
    setRestSecs(secs);
    setRestExerciseName(undefined);
    setRestTimer({ endsAt, totalSecs: secs, exerciseName: undefined, alerted: false });
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

  const fmtElapsed = (t: number) => {
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = t % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

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
    haptic("success");
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
              .eq("user_id", user!.id)
              .not("finished_at", "is", null),
            supabase
              .from("workouts")
              .select("started_at")
              .eq("user_id", user!.id)
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
    haptic("medium");
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

      {/* ── HERO ─────────────────────────────────────────────────
          Generous header that grounds the session: workout name in
          the brand serif, the elapsed timer in a big monospaced
          gold readout, and a stat row with subtle icons. The two
          actions (Discard / Finish) sit at the top corners — present
          but not crowding the hero. */}
      <header className={styles.hero}>
        <div className={styles.heroActions}>
          <button
            className={styles.discardBtn}
            onClick={() => setDiscardOpen(true)}
            type="button"
            aria-label="Discard workout"
          >
            Discard
          </button>
          <Button variant="primary" size="sm" onClick={handleFinish} loading={finishing}>
            Finish
          </Button>
        </div>

        <div className={styles.heroTitleWrap}>
          <span className={styles.heroKicker}>In session</span>
          <h1 className={styles.heroTitle}>{activeWorkout?.title || "Workout"}</h1>
        </div>

        <div className={styles.heroTimer} role="timer" aria-live="off">
          {fmtElapsed(elapsed)}
        </div>

        <div className={styles.heroStats}>
          <div className={styles.heroStat}>
            <svg className={styles.heroStatIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M5 12l5 5L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className={styles.heroStatVal}>{totalSets}</span>
            <span className={styles.heroStatLbl}>sets</span>
          </div>
          <span className={styles.heroStatDivider} aria-hidden />
          <div className={styles.heroStat}>
            <svg className={styles.heroStatIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
              <line x1="2" y1="12" x2="22" y2="12" />
              <line x1="4" y1="9" x2="4" y2="15" />
              <line x1="6" y1="7" x2="6" y2="17" />
              <line x1="18" y1="7" x2="18" y2="17" />
              <line x1="20" y1="9" x2="20" y2="15" />
            </svg>
            <span className={styles.heroStatVal}>
              {totalVolume > 0 ? Math.round(totalVolume).toLocaleString() : "0"}
              <small> kg</small>
            </span>
            <span className={styles.heroStatLbl}>volume</span>
          </div>
          <span className={styles.heroStatDivider} aria-hidden />
          <div className={styles.heroStat}>
            <svg className={styles.heroStatIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="4" width="16" height="16" rx="2"/>
              <path d="M8 9h8M8 13h8M8 17h5"/>
            </svg>
            <span className={styles.heroStatVal}>{exercises.length}</span>
            <span className={styles.heroStatLbl}>exercises</span>
          </div>
        </div>
      </header>

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

      {/* Exercises */}
      <div className={styles.content}>
        {/* Rest circle timer (only when resting) + premium quick-rest
            selector (when idle). The selector is no longer a strip of
            tiny chips — it's a card with a label and substantial pill
            buttons so it reads as a tool the user reaches for, not an
            accidental row of buttons. */}
        {restSecs > 0 ? (
          <div className={styles.timerSection}>
            <CircularTimer
              restSecs={restSecs}
              restTotal={restTotal}
              restExerciseName={restExerciseName}
              onAdjust={adjustRest}
              onSkip={skipRest}
            />
          </div>
        ) : (
          <div className={styles.quickRest}>
            <span className={styles.quickRestLabel}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="13" r="8" />
                <path d="M12 9v4l2 2" />
                <path d="M9 2h6" />
              </svg>
              Quick rest
            </span>
            <div className={styles.quickRestBtns}>
              {[60, 90, 120, 180].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => startRestPreset(s)}
                  className={styles.quickRestBtn}
                >
                  {s < 60 ? `${s}s` : s % 60 === 0 ? `${s / 60}:00` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`}
                </button>
              ))}
            </div>
          </div>
        )}
        {exercises.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyArt} aria-hidden>
              <svg viewBox="0 0 80 80" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="40" cy="40" r="36" opacity="0.15" />
                <line x1="14" y1="40" x2="66" y2="40" />
                <line x1="18" y1="34" x2="18" y2="46" />
                <line x1="22" y1="28" x2="22" y2="52" />
                <line x1="58" y1="28" x2="58" y2="52" />
                <line x1="62" y1="34" x2="62" y2="46" />
              </svg>
            </div>
            <h2 className={styles.emptyTitle}>Ready to lift?</h2>
            <p className={styles.emptyText}>Add your first exercise to start logging sets.</p>
            <button
              className={styles.emptyCta}
              onClick={() => setPickerOpen(true)}
              type="button"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/>
              </svg>
              Add exercise
            </button>
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
                const wt = parseFloat(ex.sets[idx]?.weightKg || "0") || undefined;
                await saveSet(ex.weId, idx);
                startRest(st, ex.name, ex.muscleGroups[0], wt);
              }}
              onDeleteSet={(setId) => deleteSet(ex.weId, setId)}
              onRemove={() => removeExercise(ex.weId)}
            />
          ))
        )}

        {exercises.length > 0 && (
          <button className={styles.addExerciseBtn} onClick={() => setPickerOpen(true)} type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            Add another exercise
          </button>
        )}

        {/* Spacer so the sticky finish bar doesn't cover the last card. */}
        {exercises.length > 0 && <div className={styles.finishSpacer} aria-hidden />}
      </div>

      {/* Sticky bottom finish bar — appears once at least one
          exercise is on the screen. The summary line gives the user
          a tactile preview of what they're about to commit. */}
      {exercises.length > 0 && (
        <div className={styles.finishBar}>
          <div className={styles.finishSummary}>
            <span className={styles.finishSummaryNum}>{totalSets}</span>
            <span className={styles.finishSummaryLbl}>{totalSets === 1 ? "set" : "sets"}</span>
            <span className={styles.finishSummarySep}>·</span>
            <span className={styles.finishSummaryNum}>
              {totalVolume > 0 ? Math.round(totalVolume).toLocaleString() : "0"}
            </span>
            <span className={styles.finishSummaryLbl}>kg</span>
            <span className={styles.finishSummarySep}>·</span>
            <span className={styles.finishSummaryNum}>{fmtElapsed(elapsed)}</span>
          </div>
          <button
            type="button"
            className={styles.finishBtn}
            onClick={handleFinish}
            disabled={finishing}
          >
            {finishing ? "Saving…" : "Finish workout"}
          </button>
        </div>
      )}

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

      {/* Fullscreen rest overlay (briefly shown when a set is saved) */}
      <RestOverlay
        open={restOverlayOpen && restSecs > 0}
        restSecs={restSecs}
        restTotal={restTotal}
        exerciseName={restExerciseName}
        onAdjust={adjustRest}
        onSkip={skipRest}
        onDismiss={() => setRestOverlayOpen(false)}
      />
    </div>
  );
}
