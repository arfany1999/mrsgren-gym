"use client";

import { useEffect, useState } from "react";
import { useWorkout } from "@/contexts/WorkoutContext";
import { formatDurationHHMMSS } from "@/lib/formatters";
import styles from "./WorkoutTimer.module.css";

export function WorkoutTimer() {
  const { activeWorkout } = useWorkout();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!activeWorkout?.startedAt) { setElapsed(0); return; }
    const base = Math.floor((Date.now() - new Date(activeWorkout.startedAt).getTime()) / 1000);
    setElapsed(base);
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [activeWorkout?.startedAt]);

  return (
    <div className={styles.timer} aria-live="off">
      {formatDurationHHMMSS(elapsed)}
    </div>
  );
}
