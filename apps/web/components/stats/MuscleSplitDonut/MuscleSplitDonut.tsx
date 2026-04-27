"use client";

import styles from "./MuscleSplitDonut.module.css";

interface MuscleSplitDonutProps {
  /** Map of muscle key → numeric volume (kg) for the period. */
  volumeByMuscle: Record<string, number>;
}

// GYM123 muscle accent palette — matches the prototype's `mc` mapping.
const MC: Record<string, string> = {
  chest: "#D4A843",
  back: "#5B9CF5",
  triceps: "#9B7BF4",
  biceps: "#9B7BF4",
  quads: "#3DD68C",
  glutes: "#3DD68C",
  hams: "#3DD68C",
  hamstrings: "#3DD68C",
  legs: "#3DD68C",
  shoulders: "#E8C56D",
  core: "#F06060",
  abs: "#F06060",
  cardio: "#F06060",
  forearms: "#9B7BF4",
};

const FALLBACK = "#888899";
const RADIUS = 52;
const STROKE = 18;
const SIZE = 140;
const CX = SIZE / 2;
const CY = SIZE / 2;
const CIRC = 2 * Math.PI * RADIUS;
const GAP = 2;

function muscleColor(name: string): string {
  return MC[name.toLowerCase()] ?? FALLBACK;
}

function muscleLabel(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

export function MuscleSplitDonut({ volumeByMuscle }: MuscleSplitDonutProps) {
  const entries = Object.entries(volumeByMuscle)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const total = entries.reduce((s, [, v]) => s + v, 0);

  if (total === 0) {
    return (
      <div className={styles.empty}>
        <p>No muscle volume logged yet — finish a workout to populate the split.</p>
      </div>
    );
  }

  let offset = 0;
  const segments = entries.map(([name, value]) => {
    const pct = value / total;
    const dash = Math.max(0, pct * CIRC - GAP);
    const seg = {
      name,
      value,
      pct,
      dash,
      offset,
      color: muscleColor(name),
    };
    offset += pct * CIRC;
    return seg;
  });

  return (
    <div className={styles.row}>
      <div className={styles.donut}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden>
          <circle cx={CX} cy={CY} r={RADIUS} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={STROKE} />
          {segments.map((s, i) => (
            <circle
              key={i}
              cx={CX}
              cy={CY}
              r={RADIUS}
              fill="none"
              stroke={s.color}
              strokeWidth={STROKE}
              strokeDasharray={`${s.dash} ${CIRC - s.dash}`}
              strokeDashoffset={-s.offset + CIRC * 0.25}
              strokeLinecap="butt"
              style={{ filter: `drop-shadow(0 0 3px ${s.color}80)` }}
            />
          ))}
          <text x={CX} y={CY - 4} textAnchor="middle" className={styles.donutTotal}>
            {Math.round(total).toLocaleString()}
          </text>
          <text x={CX} y={CY + 12} textAnchor="middle" className={styles.donutUnit}>
            KG · 30D
          </text>
        </svg>
      </div>

      <div className={styles.legend}>
        {segments.map((s) => (
          <div key={s.name} className={styles.legendRow}>
            <span
              className={styles.legendDot}
              style={{ background: s.color, boxShadow: `0 0 5px ${s.color}80` }}
            />
            <span className={styles.legendName}>{muscleLabel(s.name)}</span>
            <span className={styles.legendVol}>{Math.round(s.value).toLocaleString()}</span>
            <span className={styles.legendPct}>{Math.round(s.pct * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
