"use client";

import { useMemo } from "react";
import { calculatePlates } from "@/lib/plateCalculator";
import styles from "./PlateBar.module.css";

interface PlateBarProps {
  /** Total target weight including bar (kg). */
  weightKg: number;
  /** Bar weight (kg). Olympic bar is 20kg by default. */
  barWeightKg?: number;
  /** Hide if weight is 0 / falsy / below the bar. */
  hideEmpty?: boolean;
}

// Per-plate colour follows IPF/IWF competition convention so a serious
// lifter recognises the stack at a glance: 25 red, 20 blue, 15 yellow,
// 10 green, 5 white, 2.5 red(small), 1.25 chrome.
const PLATE_STYLE: Record<number, { fill: string; height: number; outline: string }> = {
  25:   { fill: "#c0392b", height: 56, outline: "rgba(255,255,255,0.18)" },
  20:   { fill: "#1f6dd0", height: 52, outline: "rgba(255,255,255,0.18)" },
  15:   { fill: "#d4a843", height: 46, outline: "rgba(255,255,255,0.22)" },
  10:   { fill: "#27895a", height: 40, outline: "rgba(255,255,255,0.18)" },
  5:    { fill: "#e8e8ec", height: 30, outline: "rgba(0,0,0,0.25)" },
  2.5:  { fill: "#3a3a44", height: 24, outline: "rgba(255,255,255,0.18)" },
  1.25: { fill: "#9aa0aa", height: 20, outline: "rgba(0,0,0,0.25)" },
};

export function PlateBar({ weightKg, barWeightKg = 20, hideEmpty = true }: PlateBarProps) {
  const result = useMemo(() => calculatePlates(weightKg, barWeightKg), [weightKg, barWeightKg]);
  const totalPlatesPerSide = result.perSide.reduce((s, p) => s + p.count, 0);
  const isJustBar = weightKg > 0 && weightKg <= barWeightKg && totalPlatesPerSide === 0;

  if (hideEmpty && weightKg <= 0) return null;

  // Flatten "[{plate:20,count:2},{plate:5,count:1}]" → [20,20,5] per side,
  // largest plate inboard (closest to the bar collar) by convention.
  const plateRow = result.perSide.flatMap((p) => Array.from({ length: p.count }, () => p.plate));

  return (
    <div
      className={styles.wrap}
      role="img"
      aria-label={
        isJustBar
          ? `${weightKg} kg — bar only`
          : result.remainder > 0
            ? `${weightKg} kg — ${result.remainder} kg cannot be loaded with standard plates`
            : `${weightKg} kg — ${plateRow.length} plates per side`
      }
    >
      <div className={styles.bar}>
        {/* left plate stack */}
        <div className={styles.stackLeft}>
          {[...plateRow].reverse().map((p, i) => (
            <span
              key={`l-${i}`}
              className={styles.plate}
              style={{
                background: PLATE_STYLE[p]?.fill ?? "#888",
                height: PLATE_STYLE[p]?.height ?? 32,
                borderColor: PLATE_STYLE[p]?.outline ?? "transparent",
              }}
              title={`${p} kg`}
            />
          ))}
        </div>
        {/* the bar itself */}
        <div className={styles.barShaft} />
        {/* right plate stack */}
        <div className={styles.stackRight}>
          {plateRow.map((p, i) => (
            <span
              key={`r-${i}`}
              className={styles.plate}
              style={{
                background: PLATE_STYLE[p]?.fill ?? "#888",
                height: PLATE_STYLE[p]?.height ?? 32,
                borderColor: PLATE_STYLE[p]?.outline ?? "transparent",
              }}
              title={`${p} kg`}
            />
          ))}
        </div>
      </div>

      <div className={styles.caption}>
        {isJustBar ? (
          <span className={styles.captionMain}>Just the bar — {barWeightKg} kg</span>
        ) : plateRow.length === 0 ? (
          <span className={styles.captionMain}>{weightKg} kg = bar only</span>
        ) : (
          <>
            <span className={styles.captionMain}>
              {plateRow.join(" + ")}
            </span>
            <span className={styles.captionMeta}>
              {plateRow.length} per side · {barWeightKg} kg bar
              {result.remainder > 0 && (
                <em className={styles.remainder}> · −{result.remainder} kg</em>
              )}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
