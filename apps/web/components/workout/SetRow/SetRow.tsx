"use client";

import { memo, useRef } from "react";
import { SetTypeSelector } from "@/components/workout/SetTypeSelector/SetTypeSelector";
import type { ActiveSet } from "@/contexts/WorkoutContext";
import type { SetType } from "@/types/api";
import type { MeasurementType } from "@/lib/exercises-data";
import { haptic } from "@/lib/haptics";
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

function SetRowImpl({ set, index, weId, prevSet, measurementType, onUpdateField, onSave, onDelete }: SetRowProps) {
  const ref1 = useRef<HTMLInputElement>(null);
  const ref2 = useRef<HTMLInputElement>(null);

  const isCardio = measurementType === "cardio";
  const isTimed = measurementType === "timed";
  const isRepsOnly = measurementType === "bodyweight_reps" || measurementType === "reps_only";
  // Default to weight_reps semantics for any unexpected value so the user
  // always sees KG + REPS inputs (last-resort safety net for legacy DB rows
  // with a `null` or typo'd measurement_type).
  const isWeightReps = !isCardio && !isTimed && !isRepsOnly;

  const canSave =
    isWeightReps ? (set.reps !== "" || set.weightKg !== "") :
    isRepsOnly   ? set.reps !== "" :
    isTimed      ? set.duration !== "" :
    isCardio     ? set.duration !== "" :
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

      {/* Cardio = time-only — distance field removed deliberately. */}

      {/* PR badge */}
      {set.isPr && <span className={styles.prBadge}>PR</span>}

      {/* Save / check button */}
      <button
        className={[styles.checkBtn, set.isSaved ? styles.checked : ""].join(" ")}
        onClick={() => { haptic(set.isSaved ? "light" : "success"); onSave(); }}
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

// Memoize with a custom comparator: keystrokes in *other* SetRows on the
// same exercise re-render the parent ExerciseBlock and produce fresh
// inline function refs for `onUpdateField`/`onSave`/`onDelete`. The default
// shallow compare treats those new refs as a change and rerenders every
// row. We only care about the data props — function refs are safe to
// ignore because they always close over the latest context state via the
// stable callbacks in WorkoutContext.
export const SetRow = memo(SetRowImpl, (a, b) => {
  if (a.index !== b.index || a.weId !== b.weId || a.measurementType !== b.measurementType) return false;
  const sa = a.set, sb = b.set;
  if (
    sa.id !== sb.id ||
    sa.isSaved !== sb.isSaved ||
    sa.isPr !== sb.isPr ||
    sa.reps !== sb.reps ||
    sa.weightKg !== sb.weightKg ||
    sa.duration !== sb.duration ||
    sa.distance !== sb.distance ||
    sa.setType !== sb.setType ||
    sa.rpe !== sb.rpe
  ) return false;
  const pa = a.prevSet, pb = b.prevSet;
  if (!pa !== !pb) return false;
  if (pa && pb && (pa.reps !== pb.reps || pa.weightKg !== pb.weightKg)) return false;
  return true;
});
