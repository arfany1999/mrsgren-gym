"use client";

import { useMemo } from "react";
import type { ActiveExercise } from "@/contexts/WorkoutContext";
import { estimateCalories, saveReport, type WorkoutReportExercise } from "@/lib/gymProfile";
import styles from "./WorkoutReport.module.css";

interface WorkoutReportProps {
  title: string;
  exercises: ActiveExercise[];
  durationMins: number;
  dayNumber: number;
  weightKg: number;
  userEmail: string | null;
  workoutId: string;
  onDone: (id: string) => void;
}

function formatDuration(mins: number): string {
  if (mins < 1)  return "< 1 min";
  if (mins < 60) return `${Math.round(mins)} min`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function calcVolume(exercises: ActiveExercise[]): number {
  return exercises.reduce((sum, e) =>
    sum + e.sets.filter(s => s.isSaved).reduce((v, s) =>
      v + (parseFloat(s.weightKg) || 0) * (parseInt(s.reps) || 0), 0), 0);
}

function formatVolume(v: number) {
  return v > 0 ? `${Math.round(v).toLocaleString()} kg` : null;
}

export function WorkoutReport({
  title, exercises, durationMins, dayNumber, weightKg, userEmail, workoutId, onDone,
}: WorkoutReportProps) {
  const totalSets = useMemo(
    () => exercises.reduce((sum, e) => sum + e.sets.filter(s => s.isSaved).length, 0),
    [exercises]
  );

  const exerciseRows = useMemo(() => {
    const withSets = exercises.filter(ex => ex.sets.some(s => s.isSaved));
    if (withSets.length === 0) return [];

    return withSets.map(ex => {
      const savedSets = ex.sets.filter(s => s.isSaved);
      const isCardio = ex.measurementType === "cardio";
      const isTimed  = ex.measurementType === "timed";

      let mins: number;
      if (isCardio) {
        const tracked = savedSets.reduce((sum, s) => sum + (parseFloat(s.duration) || 0), 0);
        mins = tracked > 0 ? tracked : (durationMins / withSets.length);
      } else if (isTimed) {
        mins = savedSets.reduce((sum, s) => sum + (parseInt(s.duration) || 30), 0) / 60;
      } else {
        mins = totalSets > 0
          ? (savedSets.length / totalSets) * durationMins
          : durationMins / withSets.length;
      }

      const calories = estimateCalories(weightKg, Math.max(mins, 1), ex.name, isCardio);

      let setSummary = "";
      if (ex.measurementType === "weight_reps") {
        setSummary = savedSets.map(s => `${s.weightKg || "—"}kg × ${s.reps || "—"}`).join(" · ");
      } else if (ex.measurementType === "bodyweight_reps" || ex.measurementType === "reps_only") {
        setSummary = savedSets.map(s => `${s.reps || "—"} reps`).join(" · ");
      } else if (isTimed) {
        setSummary = savedSets.map(s => `${s.duration || "—"}s`).join(" · ");
      } else if (isCardio) {
        setSummary = savedSets.map(s =>
          `${s.duration || "—"} min${s.distance ? ` / ${s.distance} km` : ""}`).join("  •  ");
      }

      return { ex, savedSets, calories, setSummary };
    });
  }, [exercises, durationMins, totalSets, weightKg]);

  const totalCalories = useMemo(
    () => exerciseRows.reduce((sum, r) => sum + r.calories, 0),
    [exerciseRows]
  );

  const volume     = calcVolume(exercises);
  const volumeStr  = formatVolume(volume);
  const totalExs   = exerciseRows.length;

  // ── Save report & navigate ───────────────────────────────────
  function handleDone() {
    if (userEmail) {
      const exerciseEntries: WorkoutReportExercise[] = exerciseRows.map(r => ({
        name:       r.ex.name,
        sets:       r.savedSets.length,
        calories:   r.calories,
        setSummary: r.setSummary,
      }));
      saveReport(userEmail, {
        id:            workoutId,
        date:          new Date().toISOString(),
        title,
        durationMins,
        totalCalories,
        dayNumber,
        totalSets,
        totalVolume:   volume,
        exercises:     exerciseEntries,
      });
    }
    onDone(workoutId);
  }

  return (
    <div className={styles.overlay}>

      {/* ═══════════════════ HERO ═══════════════════ */}
      <div className={styles.hero}>
        <div className={styles.orb1} />
        <div className={styles.orb2} />
        <div className={styles.orb3} />

        <div className={styles.heroInner}>
          <div className={styles.fireRing}>
            <div className={styles.fireEmoji}>🔥</div>
          </div>

          <div className={styles.textBlock}>
            <p className={styles.dayBadge}>Day {dayNumber}</p>
            <h1 className={styles.wellDone}>Well done, G!</h1>
            <p className={styles.tagline}>Another session in the books 💪</p>
          </div>

          <div className={styles.calsCard}>
            <span className={styles.calsNum}>{totalCalories.toLocaleString()}</span>
            <span className={styles.calsUnit}>KCAL BURNED</span>
          </div>

          <div className={styles.chips}>
            <div className={styles.chip}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.6)" strokeWidth="2"/>
                <path d="M12 7v5l3 3" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              {formatDuration(durationMins)}
            </div>
            <div className={styles.chip}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="9" width="4" height="6" rx="1" stroke="rgba(255,255,255,0.6)" strokeWidth="2"/>
                <rect x="17" y="9" width="4" height="6" rx="1" stroke="rgba(255,255,255,0.6)" strokeWidth="2"/>
                <rect x="7" y="10.5" width="10" height="3" rx="1.5" stroke="rgba(255,255,255,0.6)" strokeWidth="2"/>
              </svg>
              {totalExs} exercise{totalExs !== 1 ? "s" : ""}
            </div>
            <div className={styles.chip}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M5 12l5 5L19 7" stroke="rgba(255,255,255,0.6)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {totalSets} sets
            </div>
            {volumeStr && (
              <div className={styles.chip}>⚡ {volumeStr}</div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════ BREAKDOWN ═══════════════════ */}
      <div className={styles.breakdown}>
        <div className={styles.bdRow}>
          <h2 className={styles.bdTitle}>Calorie Breakdown</h2>
          <span className={styles.bdNote}>est. ±20–30%</span>
        </div>

        <div className={styles.exList}>
          {exerciseRows.map(({ ex, savedSets, calories, setSummary }) => {
            const initials = ex.name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
            return (
              <div key={ex.weId} className={styles.exCard}>
                <div className={styles.exAvatar}>{initials}</div>
                <div className={styles.exInfo}>
                  <p className={styles.exName}>{ex.name}</p>
                  <p className={styles.exMeta}>
                    {savedSets.length} set{savedSets.length !== 1 ? "s" : ""}
                    {setSummary && <span className={styles.exDetail}> · {setSummary}</span>}
                  </p>
                </div>
                <div className={styles.exCals}>
                  <span className={styles.exCalNum}>{calories}</span>
                  <span className={styles.exCalUnit}>kcal</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className={styles.totalRow}>
          <span className={styles.totalLabel}>Total burned</span>
          <div className={styles.totalRight}>
            <span className={styles.totalNum}>{totalCalories.toLocaleString()}</span>
            <span className={styles.totalUnit}>kcal</span>
          </div>
        </div>

        <p className={styles.disclaimer}>
          * Estimate only. Actual burn varies by body composition, heart rate, and intensity (±20–30%).
        </p>

        <button className={styles.doneBtn} type="button" onClick={handleDone}>
          Back to Home
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
