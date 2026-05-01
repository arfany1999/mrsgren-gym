"use client";

import styles from "./RestOverlay.module.css";

interface RestOverlayProps {
  open: boolean;
  restSecs: number;
  restTotal: number;
  exerciseName?: string;
  onAdjust: (delta: number) => void;
  onSkip: () => void;
  onDismiss: () => void;
}

const SIZE = 240;
const STROKE = 12;
const R = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * R;

export function RestOverlay({
  open,
  restSecs,
  restTotal,
  exerciseName,
  onAdjust,
  onSkip,
  onDismiss,
}: RestOverlayProps) {
  if (!open || restSecs <= 0) return null;

  const pct = restTotal > 0 ? Math.max(0, Math.min(1, restSecs / restTotal)) : 0;
  const dash = pct * CIRC;
  const m = Math.floor(restSecs / 60);
  const s = restSecs % 60;

  return (
    <div className={styles.overlay} onClick={onDismiss}>
      <p className={styles.kicker}>REST TIMER</p>
      {exerciseName && <p className={styles.exName}>{exerciseName}</p>}

      <div className={styles.ringBox}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className={styles.ringSvg}>
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={STROKE}
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke="#D4A843"
            strokeWidth={STROKE}
            strokeDasharray={`${dash.toFixed(2)} ${CIRC.toFixed(2)}`}
            strokeLinecap="round"
            className={styles.ringActive}
          />
        </svg>
        <div className={styles.center}>
          <span className={styles.value}>
            {m}:{String(s).padStart(2, "0")}
          </span>
          <span className={styles.subLabel}>seconds left</span>
        </div>
      </div>

      <div className={styles.controls} onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={() => onAdjust(-15)} className={styles.adjustBtn}>
          −15s
        </button>
        <button type="button" onClick={() => { onSkip(); onDismiss(); }} className={styles.skipBtn}>
          Skip
        </button>
        <button type="button" onClick={() => onAdjust(15)} className={styles.adjustBtn}>
          +15s
        </button>
      </div>

      <p className={styles.hint}>tap anywhere to dismiss</p>
    </div>
  );
}
