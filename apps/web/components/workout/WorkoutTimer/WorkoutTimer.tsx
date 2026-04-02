"use client";

import { useWorkout } from "@/contexts/WorkoutContext";
import { formatDurationHHMMSS } from "@/lib/formatters";
import styles from "./WorkoutTimer.module.css";

export function WorkoutTimer() {
  const { elapsedSeconds } = useWorkout();
  return (
    <div className={styles.timer} aria-live="off">
      {formatDurationHHMMSS(elapsedSeconds)}
    </div>
  );
}
