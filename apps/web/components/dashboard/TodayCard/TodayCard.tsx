"use client";

import type { RoutineSummary } from "@/lib/api/routines";
import type { WorkoutInfo } from "@/lib/api/workouts";
import styles from "./TodayCard.module.css";

interface TodaySuggestion {
  routine: RoutineSummary;
  reason: string;
  estMinutes: number;
}

interface TodayCardProps {
  routines: RoutineSummary[];
  workoutInfoMap: Map<string, WorkoutInfo>;
  onStart: (routine: RoutineSummary) => void;
  startingId: string | null;
}

const DAY_NAMES = [
  "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
] as const;

// Pick the routine the user is most likely to want to run *now*. Three
// heuristics, in priority order:
//   1. The routine whose name contains today's day name (e.g. a routine
//      called "Wednesday — Push" on a Wednesday).
//   2. The routine with the LONGEST gap since last performed (most due).
//   3. Most-recently-edited routine as a final fallback.
function pickToday(
  routines: RoutineSummary[],
  workoutInfoMap: Map<string, WorkoutInfo>,
): TodaySuggestion | null {
  const populated = routines.filter((r) => r.exercises.length > 0);
  if (populated.length === 0) return null;

  const todayName = DAY_NAMES[new Date().getDay()] ?? "today";
  const todayShort = todayName.slice(0, 3);
  const matchToday = populated.find((r) => {
    const t = r.title.toLowerCase();
    return t.includes(todayName) || new RegExp(`\\b${todayShort}\\b`).test(t);
  });
  if (matchToday) {
    return {
      routine: matchToday,
      reason: `Scheduled for ${todayName.charAt(0).toUpperCase() + todayName.slice(1)}`,
      estMinutes: estimateMinutes(matchToday),
    };
  }

  // Longest gap = most due. Routines that have never been done sort to
  // the top (treated as gap = +Infinity).
  const sorted = [...populated].sort((a, b) => {
    const aDate = workoutInfoMap.get(a.id)?.lastDate;
    const bDate = workoutInfoMap.get(b.id)?.lastDate;
    const aMs = aDate ? Date.now() - new Date(aDate).getTime() : Infinity;
    const bMs = bDate ? Date.now() - new Date(bDate).getTime() : Infinity;
    return bMs - aMs;
  });
  const top = sorted[0]!;
  const lastDate = workoutInfoMap.get(top.id)?.lastDate;
  const reason = lastDate
    ? `Longest gap — last done ${relativeAgo(lastDate)}`
    : `You've never run this one`;
  return {
    routine: top,
    reason,
    estMinutes: estimateMinutes(top),
  };
}

// Crude estimate: 4 working sets × ~75s rest + ~30s per set ≈ ~7 min per
// exercise. Cardio and timed sessions are too variable to estimate well,
// so we conservatively budget the same.
function estimateMinutes(r: RoutineSummary): number {
  return Math.max(15, Math.round(r.exercises.length * 7));
}

function relativeAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7)   return `${days} days ago`;
  if (days < 30)  return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

export function TodayCard({ routines, workoutInfoMap, onStart, startingId }: TodayCardProps) {
  const pick = pickToday(routines, workoutInfoMap);
  if (!pick) return null;

  const muscleGroups = [...new Set(pick.routine.exercises.flatMap((e) => e.muscleGroups))];
  const muscleLabel = muscleGroups[0]
    ? muscleGroups[0].charAt(0).toUpperCase() + muscleGroups[0].slice(1).toLowerCase()
    : "Mixed";
  const isStarting = startingId === pick.routine.id;

  return (
    <section className={styles.card} aria-label="Today's suggested workout">
      <div className={styles.header}>
        <span className={styles.kicker}>Today</span>
        <span className={styles.reason}>{pick.reason}</span>
      </div>
      <h2 className={styles.title}>{pick.routine.title}</h2>
      <div className={styles.metaRow}>
        <span className={styles.metaItem}>
          <span className={styles.metaNum}>{pick.routine.exercises.length}</span>
          <span className={styles.metaLbl}>exercises</span>
        </span>
        <span className={styles.metaDivider} />
        <span className={styles.metaItem}>
          <span className={styles.metaNum}>{pick.routine.totalSets}</span>
          <span className={styles.metaLbl}>sets</span>
        </span>
        <span className={styles.metaDivider} />
        <span className={styles.metaItem}>
          <span className={styles.metaNum}>~{pick.estMinutes}m</span>
          <span className={styles.metaLbl}>{muscleLabel}</span>
        </span>
      </div>
      <button
        type="button"
        className={styles.startBtn}
        onClick={() => onStart(pick.routine)}
        disabled={isStarting}
      >
        {isStarting ? "Starting…" : "Start workout"}
      </button>
    </section>
  );
}
