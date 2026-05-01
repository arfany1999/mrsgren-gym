"use client";

import { useEffect, useState } from "react";
import { useWorkout } from "@/contexts/WorkoutContext";
import styles from "./CircularTimer.module.css";

interface CircularTimerProps {
  restSecs: number;
  restTotal: number;
  restExerciseName?: string;
  onAdjust: (delta: number) => void;
  onSkip: () => void;
}

const SIZE = 200;
const STROKE = 10;
const OUTER_R = (SIZE - STROKE) / 2;
const INNER_R = OUTER_R - STROKE - 5;
const OUTER_CIRC = 2 * Math.PI * OUTER_R;
const INNER_CIRC = 2 * Math.PI * INNER_R;
const LOOP_SECS = 60 * 60;

const LAP_COLORS = [
  "rgba(74,110,245,0.7)",
  "rgba(61,214,140,0.7)",
  "rgba(155,123,244,0.7)",
  "rgba(91,156,245,0.7)",
];

function fmtElapsed(t: number): string {
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function fmtRest(s: number): string {
  if (s <= 0) return "0:00";
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function CircularTimer({
  restSecs,
  restTotal,
  restExerciseName,
  onAdjust,
  onSkip,
}: CircularTimerProps) {
  const { activeWorkout } = useWorkout();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!activeWorkout?.startedAt) {
      setElapsed(0);
      return;
    }
    const startedAtMs = new Date(activeWorkout.startedAt).getTime();
    const recompute = () => setElapsed(Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000)));
    recompute();
    const id = window.setInterval(recompute, 1000);
    const onVis = () => { if (!document.hidden) recompute(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", recompute);
    window.addEventListener("pageshow", recompute);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", recompute);
      window.removeEventListener("pageshow", recompute);
    };
  }, [activeWorkout?.startedAt]);

  const loops = Math.floor(elapsed / LOOP_SECS);
  const secsIntoLoop = elapsed % LOOP_SECS;
  const workoutPct = secsIntoLoop / LOOP_SECS;
  const workoutDash = workoutPct * OUTER_CIRC;

  const restPct = restTotal > 0 ? Math.max(0, Math.min(1, restSecs / restTotal)) : 0;
  const restDash = restPct * INNER_CIRC;

  const isResting = restSecs > 0;
  const lapColor = LAP_COLORS[loops % LAP_COLORS.length]!;
  const workoutColor = isResting ? "rgba(212,168,67,0.18)" : lapColor;

  const workoutName = activeWorkout?.title ?? "";

  return (
    <div className={styles.timerWrap}>
      <div className={styles.ringBox}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className={styles.ringSvg}>
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={OUTER_R}
            fill="none"
            stroke="var(--circular-track)"
            strokeWidth={STROKE}
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={OUTER_R}
            fill="none"
            stroke={workoutColor}
            strokeWidth={STROKE}
            strokeDasharray={`${workoutDash.toFixed(2)} ${OUTER_CIRC.toFixed(2)}`}
            strokeLinecap="round"
            className={styles.ringTransition}
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={INNER_R}
            fill="none"
            stroke="var(--circular-track-inner)"
            strokeWidth={STROKE - 2}
          />
          {isResting && (
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={INNER_R}
              fill="none"
              stroke="#D4A843"
              strokeWidth={STROKE - 2}
              strokeDasharray={`${restDash.toFixed(2)} ${INNER_CIRC.toFixed(2)}`}
              strokeLinecap="round"
              className={styles.restRingActive}
            />
          )}
          {[0, 90, 180, 270].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            const cx = SIZE / 2 + (OUTER_R + 6) * Math.cos(rad);
            const cy = SIZE / 2 + (OUTER_R + 6) * Math.sin(rad);
            return <circle key={deg} cx={cx} cy={cy} r={1.5} fill="var(--circular-tick)" />;
          })}
        </svg>

        <div className={styles.center}>
          {isResting ? (
            <>
              <div className={styles.restLabel}>REST</div>
              <div className={styles.restValue}>{fmtRest(restSecs)}</div>
              {restExerciseName && (
                <div className={styles.restName}>{restExerciseName}</div>
              )}
              <div className={styles.totalElapsed}>{fmtElapsed(elapsed)} total</div>
            </>
          ) : (
            <>
              {loops > 0 && (
                <div
                  className={styles.lapBadge}
                  style={{
                    color: lapColor.replace("0.7", "1"),
                    background: lapColor.replace("0.7", "0.15"),
                  }}
                >
                  HR {loops + 1}
                </div>
              )}
              <div className={styles.workoutLabel}>WORKOUT</div>
              <div className={styles.workoutValue}>{fmtElapsed(elapsed)}</div>
              {workoutName && <div className={styles.workoutName}>{workoutName}</div>}
            </>
          )}
        </div>
      </div>

      {isResting && (
        <div className={styles.controls}>
          <button type="button" onClick={() => onAdjust(-15)} className={styles.adjustBtn}>
            −15s
          </button>
          <button type="button" onClick={onSkip} className={styles.skipBtn}>
            Skip
          </button>
          <button type="button" onClick={() => onAdjust(15)} className={styles.adjustBtn}>
            +15s
          </button>
        </div>
      )}
    </div>
  );
}
