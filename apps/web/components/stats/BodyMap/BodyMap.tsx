"use client";

import { useMemo, useState } from "react";
import { BodyMuscleIcon } from "@/components/ui/BodyMuscleIcon/BodyMuscleIcon";
import styles from "./BodyMap.module.css";

interface Props {
  /** Map of muscle group → cumulative volume (kg) over the lookback window. */
  volumeByMuscle: Record<string, number>;
}

const MUSCLE_COLOR: Record<string, string> = {
  chest: "var(--accent)",
  back: "var(--accent-blue, #5B9CF5)",
  shoulders: "var(--accent-orange, #E8C56D)",
  biceps: "var(--accent-purple, #9B7BF4)",
  triceps: "var(--accent-purple, #9B7BF4)",
  legs: "var(--accent-green, #3DD68C)",
  core: "var(--accent-red, #F06060)",
  cardio: "var(--accent-red, #F06060)",
};

const ORDER = ["chest", "back", "shoulders", "biceps", "triceps", "legs", "core", "cardio"];

export function BodyMap({ volumeByMuscle }: Props) {
  const [filter, setFilter] = useState<string | null>(null);

  // Top-3 muscles by volume drive the default highlight set.
  const topMuscles = useMemo(() => {
    return Object.entries(volumeByMuscle)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([m]) => m);
  }, [volumeByMuscle]);

  const highlighted = filter ? [filter] : topMuscles;

  const present = useMemo(() => {
    const set = new Set(Object.keys(volumeByMuscle).map((m) => m.toLowerCase()));
    return ORDER.filter((m) => set.has(m));
  }, [volumeByMuscle]);

  return (
    <div className={styles.root}>
      <div className={styles.views}>
        <div className={styles.viewCol}>
          <span className={styles.viewLbl}>FRONT</span>
          <div className={styles.svgWrap}>
            <BodyMuscleIcon muscles={highlighted} variant="full" />
          </div>
        </div>
      </div>

      {present.length > 0 && (
        <div className={styles.legend}>
          {present.map((m) => {
            const isActive = filter === m;
            const col = MUSCLE_COLOR[m] || "var(--accent)";
            return (
              <button
                key={m}
                className={styles.chip}
                data-active={isActive}
                onClick={() => setFilter(isActive ? null : m)}
                style={{
                  border: `1px solid ${col}`,
                  background: isActive ? col : "transparent",
                  color: isActive ? undefined : col,
                }}
              >
                {m}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
