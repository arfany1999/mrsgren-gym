"use client";

import { useMemo } from "react";
import type { ActiveExercise } from "@/contexts/WorkoutContext";
import { estimateCalories } from "@/lib/gymProfile";
import styles from "./WorkoutReport.module.css";

interface WorkoutReportProps {
  title: string;
  exercises: ActiveExercise[];
  durationMins: number;   // total workout duration
  weightKg: number;       // user's body weight for MET calc
  workoutId: string;
  onDone: (id: string) => void;
}

function formatDuration(mins: number): string {
  if (mins < 1) return "< 1 min";
  if (mins < 60) return `${Math.round(mins)} min`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatVolume(exercises: ActiveExercise[]): string {
  const vol = exercises.reduce((sum, e) =>
    sum + e.sets.filter(s => s.isSaved).reduce((v, s) =>
      v + (parseFloat(s.weightKg) || 0) * (parseInt(s.reps) || 0), 0), 0);
  return vol > 0 ? `${Math.round(vol).toLocaleString()} kg` : null as unknown as string;
}

export function WorkoutReport({
  title, exercises, durationMins, weightKg, workoutId, onDone,
}: WorkoutReportProps) {
  const totalSets = useMemo(
    () => exercises.reduce((sum, e) => sum + e.sets.filter(s => s.isSaved).length, 0),
    [exercises]
  );

  // Build per-exercise calorie rows
  const exerciseRows = useMemo(() => {
    const withSets = exercises.filter(ex => ex.sets.some(s => s.isSaved));
    if (withSets.length === 0) return [];

    return withSets.map(ex => {
      const savedSets = ex.sets.filter(s => s.isSaved);
      const isCardio = ex.measurementType === "cardio";
      const isTimed  = ex.measurementType === "timed";

      // Calculate effective duration for this exercise
      let mins: number;
      if (isCardio) {
        // Use logged duration if available
        const trackedMins = savedSets.reduce((sum, s) => sum + (parseFloat(s.duration) || 0), 0);
        mins = trackedMins > 0 ? trackedMins : (durationMins / withSets.length);
      } else if (isTimed) {
        // Sum all set durations (they're in seconds)
        const totalSec = savedSets.reduce((sum, s) => sum + (parseInt(s.duration) || 30), 0);
        mins = totalSec / 60;
      } else {
        // Weight/bodyweight: split time proportionally by sets
        const exSets = savedSets.length;
        mins = totalSets > 0 ? (exSets / totalSets) * durationMins : durationMins / withSets.length;
      }

      const calories = estimateCalories(weightKg, Math.max(mins, 1), ex.name, isCardio);

      // Build a readable summary of what was done
      let setSummary = "";
      if (ex.measurementType === "weight_reps") {
        setSummary = savedSets.map(s =>
          `${s.weightKg || "—"}kg × ${s.reps || "—"}`).join(" · ");
      } else if (ex.measurementType === "bodyweight_reps" || ex.measurementType === "reps_only") {
        setSummary = savedSets.map(s => `${s.reps || "—"} reps`).join(" · ");
      } else if (isTimed) {
        setSummary = savedSets.map(s => `${s.duration || "—"}s`).join(" · ");
      } else if (isCardio) {
        setSummary = savedSets.map(s =>
          `${s.duration || "—"} min${s.distance ? ` / ${s.distance} km` : ""}`
        ).join("  •  ");
      }

      return { ex, savedSets, calories, setSummary, mins };
    });
  }, [exercises, durationMins, totalSets, weightKg]);

  const totalCalories = useMemo(
    () => exerciseRows.reduce((sum, r) => sum + r.calories, 0),
    [exerciseRows]
  );

  const volume = formatVolume(exercises);
  const totalExercises = exerciseRows.length;

  return (
    <div className={styles.overlay}>
      {/* ═══════════════════ HERO BANNER ═══════════════════ */}
      <div className={styles.hero}>
        {/* Animated gradient orbs */}
        <div className={styles.orb1} />
        <div className={styles.orb2} />
        <div className={styles.orb3} />

        <div className={styles.heroInner}>
          {/* Fire ring */}
          <div className={styles.fireRing}>
            <div className={styles.fireRingInner}>🔥</div>
          </div>

          {/* Well done */}
          <div className={styles.congratsBlock}>
            <p className={styles.wellDone}>Well done, G!</p>
            <p className={styles.tagline}>You crushed another session 💪</p>
          </div>

          {/* Giant calorie number */}
          <div className={styles.calsHero}>
            <div className={styles.calsRow}>
              <span className={styles.calsNum}>{totalCalories.toLocaleString()}</span>
            </div>
            <span className={styles.calsLabel}>ESTIMATED KCAL BURNED</span>
          </div>

          {/* Stat chips */}
          <div className={styles.chips}>
            <div className={styles.chip}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.65)" strokeWidth="2"/>
                <path d="M12 7v5l3 3" stroke="rgba(255,255,255,0.65)" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              {formatDuration(durationMins)}
            </div>
            <div className={styles.chip}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="9" width="4" height="6" rx="1" stroke="rgba(255,255,255,0.65)" strokeWidth="2"/>
                <rect x="17" y="9" width="4" height="6" rx="1" stroke="rgba(255,255,255,0.65)" strokeWidth="2"/>
                <rect x="7" y="10.5" width="10" height="3" rx="1.5" stroke="rgba(255,255,255,0.65)" strokeWidth="2"/>
              </svg>
              {totalExercises} exercise{totalExercises !== 1 ? "s" : ""}
            </div>
            <div className={styles.chip}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M5 12l5 5L19 7" stroke="rgba(255,255,255,0.65)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {totalSets} sets
            </div>
            {volume && (
              <div className={styles.chip}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z" stroke="rgba(255,255,255,0.65)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {volume}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════ BREAKDOWN ═══════════════════ */}
      <div className={styles.breakdown}>
        {/* Header */}
        <div className={styles.bdHeader}>
          <h2 className={styles.bdTitle}>Calorie Breakdown</h2>
          <span className={styles.bdDisclaimer}>est. ±20–30%</span>
        </div>

        {/* Exercise cards */}
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

        {/* Total row */}
        <div className={styles.totalRow}>
          <span className={styles.totalLabel}>Total burned</span>
          <div className={styles.totalRight}>
            <span className={styles.totalNum}>{totalCalories.toLocaleString()}</span>
            <span className={styles.totalUnit}>kcal</span>
          </div>
        </div>

        <p className={styles.disclaimerNote}>
          * Estimate only. Actual burn varies by body composition, heart rate, and intensity (±20–30%).
        </p>

        {/* CTA */}
        <button className={styles.doneBtn} type="button" onClick={() => onDone(workoutId)}>
          Back to Home
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
