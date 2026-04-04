"use client";

import { useRef } from "react";
import { SetTypeSelector } from "@/components/workout/SetTypeSelector/SetTypeSelector";
import type { ActiveSet } from "@/contexts/WorkoutContext";
import type { SetType } from "@/types/api";
import styles from "./SetRow.module.css";

interface SetRowProps {
  set: ActiveSet;
  index: number;
  weId: string;
  prevSet?: { reps: string; weightKg: string };
  onUpdateField: (field: keyof ActiveSet, value: string | SetType | boolean | number) => void;
  onSave: () => void;
  onDelete: (setId: string) => void;
}

export function SetRow({ set, index, weId, prevSet, onUpdateField, onSave, onDelete }: SetRowProps) {
  const weightRef = useRef<HTMLInputElement>(null);
  const repsRef = useRef<HTMLInputElement>(null);

  const canSave = set.reps !== "" || set.weightKg !== "";

  return (
    <div className={[styles.row, set.isSaved ? styles.saved : "", set.isPr ? styles.pr : ""].filter(Boolean).join(" ")}>
      {/* Set number */}
      <div className={styles.num}>
        <SetTypeSelector
          value={set.setType}
          onChange={(t) => onUpdateField("setType", t)}
          setNumber={index + 1}
        />
      </div>

      {/* Previous best */}
      <div className={styles.prev}>
        {prevSet && (prevSet.weightKg || prevSet.reps)
          ? `${prevSet.weightKg || "–"}×${prevSet.reps || "–"}`
          : "—"}
      </div>

      {/* Weight */}
      <div className={styles.inputWrap}>
        <input
          ref={weightRef}
          className={styles.numInput}
          type="tel"
          inputMode="decimal"
          placeholder="0"
          value={set.weightKg}
          onChange={(e) => onUpdateField("weightKg", e.target.value)}
          onFocus={(e) => e.target.select()}
        />
        <span className={styles.inputLabel}>kg</span>
      </div>

      {/* Reps */}
      <div className={styles.inputWrap}>
        <input
          ref={repsRef}
          className={styles.numInput}
          type="tel"
          inputMode="numeric"
          placeholder="0"
          value={set.reps}
          onChange={(e) => onUpdateField("reps", e.target.value)}
          onFocus={(e) => e.target.select()}
        />
        <span className={styles.inputLabel}>reps</span>
      </div>

      {/* PR badge */}
      {set.isPr && <span className={styles.prBadge}>PR</span>}

      {/* Save / check button */}
      <button
        className={[styles.checkBtn, set.isSaved ? styles.checked : ""].join(" ")}
        onClick={onSave}
        disabled={!canSave}
        type="button"
        aria-label={set.isSaved ? "Set saved" : "Save set"}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M5 12l5 5L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

    </div>
  );
}
