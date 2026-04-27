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
    const startedAtMs = new Date(activeWorkout.startedAt).getTime();
    // Always derive elapsed from wall-clock so the counter stays correct
    // through phone locks, app swipes and OS-paused timers. Plain accumulator
    // would drift while the tab was backgrounded.
    const recompute = () => setElapsed(Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000)));
    recompute();
    const id = setInterval(recompute, 1000);
    const onVis = () => { if (!document.hidden) recompute(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", recompute);
    window.addEventListener("pageshow", recompute);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", recompute);
      window.removeEventListener("pageshow", recompute);
    };
  }, [activeWorkout?.startedAt]);

  return (
    <div className={styles.timer} aria-live="off">
      {formatDurationHHMMSS(elapsed)}
    </div>
  );
}
