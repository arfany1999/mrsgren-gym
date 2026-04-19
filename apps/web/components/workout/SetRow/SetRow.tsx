"use client";

import { useRef } from "react";
import { SetTypeSelector } from "@/components/workout/SetTypeSelector/SetTypeSelector";
import type { ActiveSet } from "@/contexts/WorkoutContext";
import type { SetType } from "@/types/api";
import type { MeasurementType } from "@/lib/exercises-data";
import styles from "./SetRow.module.css";

interface SetRowProps {
  set: ActiveSet;
  index: number;
  weId: string;
  prevSet?: { reps: string; weightKg: string };
  measurementType: MeasurementType;
  onUpdateField: (field: keyof ActiveSet, value: string | SetType | boolean | number) => void;
  onSave: () => void;
  onDelete: (setId: string) => void;
}

function prevLabel(prevSet: { reps: string; weightKg: string } | undefined, type: MeasurementType): string {
  if (!prevSet) return "—";
  const { reps, weightKg } = prevSet;
  if (!reps && !weightKg) return "—";
  if (type === "weight_reps") return `${weightKg || "–"}×${reps || "–"}`;
  if (type === "bodyweight_reps" || type === "reps_only") return reps ? `${reps} reps` : "—";
  if (type === "timed") return reps ? `${reps}s` : "—";   // stored in reps column as seconds
  if (type === "cardio") return reps ? `${reps}m` : "—";  // stored in reps column as minutes
  return "—";
}

export function SetRow({ set, index, weId, prevSet, measurementType, onUpdateField, onSave, onDelete }: SetRowProps) {
  const ref1 = useRef<HTMLInputElement>(null);
  const ref2 = useRef<HTMLInputElement>(null);

  const isCardio = measurementType === "cardio";
  const isTimed = measurementType === "timed";
  const isWeightReps = measurementType === "weight_reps";
  const isRepsOnly = measurementType === "bodyweight_reps" || measurementType === "reps_only";

  const canSave =
    isWeightReps ? (set.reps !== "" || set.weightKg !== "") :
    isRepsOnly   ? set.reps !== "" :
    isTimed      ? set.duration !== "" :
    isCardio     ? (set.duration !== "" || set.distance !== "") :
    false;

  const rowClasses = [
    styles.row,
    set.isSaved ? styles.saved : "",
    set.isPr    ? styles.pr    : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={rowClasses} data-type={measurementType}>

      {/* Set number — hidden for pure cardio (no set concept) */}
      {!isCardio && (
        <div className={styles.num}>
          <SetTypeSelector
            value={set.setType}
            onChange={(t) => onUpdateField("setType", t)}
            setNumber={index + 1}
          />
        </div>
      )}

      {/* Previous best — hidden for pure cardio */}
      {!isCardio && (
        <div className={styles.prev}>
          {prevLabel(prevSet, measurementType)}
        </div>
      )}

      {/* ── Weight (kg) — weight_reps only ── */}
      {isWeightReps && (
        <div className={styles.inputWrap}>
          <input
            ref={ref1}
            className={styles.numInput}
            type="tel"
            inputMode="decimal"
            placeholder="0"
            value={set.weightKg}
            onChange={(e) => onUpdateField("weightKg", e.target.value)}
            onFocus={(e) => e.target.select()}
          />
        </div>
      )}

      {/* ── Reps — weight_reps, bodyweight_reps, reps_only ── */}
      {(isWeightReps || isRepsOnly) && (
        <div className={styles.inputWrap}>
          <input
            ref={isWeightReps ? ref2 : ref1}
            className={styles.numInput}
            type="tel"
            inputMode="numeric"
            placeholder="0"
            value={set.reps}
            onChange={(e) => onUpdateField("reps", e.target.value)}
            onFocus={(e) => e.target.select()}
          />
        </div>
      )}

      {/* ── Duration — timed (seconds) and cardio (minutes) ── */}
      {(isTimed || isCardio) && (
        <div className={styles.inputWrap}>
          <input
            ref={ref1}
            className={styles.numInput}
            type="tel"
            inputMode="numeric"
            placeholder="0"
            value={set.duration}
            onChange={(e) => onUpdateField("duration", e.target.value)}
            onFocus={(e) => e.target.select()}
          />
        </div>
      )}

      {/* ── Distance (km) — cardio only ── */}
      {isCardio && (
        <div className={styles.inputWrap}>
          <input
            ref={ref2}
            className={styles.numInput}
            type="tel"
            inputMode="decimal"
            placeholder="0"
            value={set.distance}
            onChange={(e) => onUpdateField("distance", e.target.value)}
            onFocus={(e) => e.target.select()}
          />
        </div>
      )}

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
