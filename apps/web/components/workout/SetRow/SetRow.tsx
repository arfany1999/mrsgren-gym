"use client";

import { memo, useMemo, useRef } from "react";
import { SetTypeSelector } from "@/components/workout/SetTypeSelector/SetTypeSelector";
import type { ActiveSet } from "@/contexts/WorkoutContext";
import type { SetType } from "@/types/api";
import type { MeasurementType } from "@/lib/exercises-data";
import { detectLivePR, type ExerciseBest } from "@/lib/exerciseHistory";
import { haptic } from "@/lib/haptics";
import styles from "./SetRow.module.css";

interface SetRowProps {
  set: ActiveSet;
  index: number;
  weId: string;
  prevSet?: { reps: string; weightKg: string };
  measurementType: MeasurementType;
  previousBest?: ExerciseBest;
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

function SetRowImpl({ set, index, prevSet, measurementType, previousBest, onUpdateField, onSave }: SetRowProps) {
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

  // ── Real-time PR detection ───────────────────────────────────
  // Compute live whether the current values would beat the user's
  // lifetime best. Lights the gold trophy on every keystroke for
  // weight_reps lifts so the moment the user types something that
  // would set a new record, they see it before they save.
  const livePR = useMemo(() => {
    if (!isWeightReps) return { isPR: false, categories: [] as Array<"weight" | "reps" | "volume" | "e1rm"> };
    const w = parseFloat(set.weightKg) || 0;
    const r = parseInt(set.reps) || 0;
    return detectLivePR(w, r, previousBest);
  }, [isWeightReps, set.weightKg, set.reps, previousBest]);

  const showTrophy = set.isPr || livePR.isPR;
  const trophyTitle = set.isPr
    ? "Personal Record!"
    : livePR.categories.length
      ? `New ${livePR.categories.map(c => c === "e1rm" ? "1RM" : c).join(" + ")} PR if you save this`
      : "";

  const rowClasses = [
    styles.row,
    set.isSaved ? styles.saved : "",
    showTrophy  ? styles.pr    : "",
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

      {/* Gold trophy badge — lights up the instant the live values
          beat any of the user's lifetime bests (weight, reps, volume,
          or estimated 1RM), and stays lit once the set is saved. */}
      {showTrophy && (
        <span
          className={[
            styles.prBadge,
            set.isPr ? styles.prSaved : styles.prLive,
          ].join(" ")}
          title={trophyTitle}
          aria-label={trophyTitle}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M7 4h10v3a5 5 0 0 1-10 0V4Z"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="0.5"
            />
            <path
              d="M5 5H3v2a3 3 0 0 0 3 3M19 5h2v2a3 3 0 0 1-3 3"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M9 14h6v2H9zM10 16h4v3h-4zM8 19h8"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
          <span className={styles.prBadgeLabel}>PR</span>
        </span>
      )}

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
  // Re-render if the lifetime-best snapshot for this exercise changes
  // (it does after a set save, when the workout's own PR raises the
  // bar and subsequent sets on the same exercise should compare
  // against the new ceiling).
  const ba = a.previousBest, bb = b.previousBest;
  if (!ba !== !bb) return false;
  if (ba && bb && (
    ba.bestWeight !== bb.bestWeight ||
    ba.bestReps !== bb.bestReps ||
    ba.bestVolume !== bb.bestVolume ||
    ba.bestE1RM !== bb.bestE1RM
  )) return false;
  return true;
});
