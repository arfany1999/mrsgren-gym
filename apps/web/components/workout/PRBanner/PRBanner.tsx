"use client";

import { useEffect } from "react";
import { useWorkout } from "@/contexts/WorkoutContext";
import styles from "./PRBanner.module.css";

export function PRBanner() {
  const { showPrBanner, prExerciseName, clearPrBanner } = useWorkout();

  useEffect(() => {
    if (showPrBanner) {
      const t = setTimeout(clearPrBanner, 3500);
      return () => clearTimeout(t);
    }
  }, [showPrBanner, clearPrBanner]);

  if (!showPrBanner) return null;

  return (
    <div className={styles.banner} role="alert">
      <span className={styles.trophy}>🏆</span>
      <div>
        <p className={styles.title}>New Personal Record!</p>
        {prExerciseName && <p className={styles.sub}>{prExerciseName}</p>}
      </div>
      <button className={styles.close} onClick={clearPrBanner} aria-label="Dismiss">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
