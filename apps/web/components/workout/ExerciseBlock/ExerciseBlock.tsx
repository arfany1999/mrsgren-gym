"use client";

import { useState, useMemo } from "react";
import { SetRow } from "@/components/workout/SetRow/SetRow";
import { progressiveOverloadHint } from "@/lib/exerciseHistory";
import type { ActiveExercise, ActiveSet } from "@/contexts/WorkoutContext";
import type { SetType } from "@/types/api";
import styles from "./ExerciseBlock.module.css";

interface ExerciseBlockProps {
  exercise: ActiveExercise;
  onAddSet: () => void;
  onUpdateField: (idx: number, field: keyof ActiveSet, value: string | SetType | boolean | number) => void;
  onSaveSet: (idx: number) => void;
  onDeleteSet: (setId: string) => void;
  onRemove: () => void;
}

export function ExerciseBlock({
  exercise,
  onAddSet,
  onUpdateField,
  onSaveSet,
  onDeleteSet,
  onRemove,
}: ExerciseBlockProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [note, setNote] = useState("");

  const { nudge, lastTopSet } = useMemo(() => {
    if (exercise.measurementType !== "weight_reps" || !exercise.previousSets.length) {
      return { nudge: null, lastTopSet: null };
    }
    // Top set = highest weight × reps product from last session
    let topW = 0, topR = 0, topScore = -1;
    exercise.previousSets.forEach(s => {
      const w = parseFloat(s.weightKg) || 0;
      const r = parseInt(s.reps) || 0;
      const score = w * r;
      if (score > topScore) { topScore = score; topW = w; topR = r; }
    });
    if (topW <= 0) return { nudge: null, lastTopSet: null };
    const hint = progressiveOverloadHint(topW, topR);
    return {
      nudge: hint ? { ...hint, prevWeight: topW, prevReps: topR } : null,
      lastTopSet: { weight: topW, reps: topR },
    };
  }, [exercise.previousSets, exercise.measurementType]);

  const pr = exercise.personalRecord;
  // Only show "Use last weights" when at least one unsaved set is missing a value
  const hasEmptyUnsavedSet = !!lastTopSet && exercise.sets.some(s =>
    !s.isSaved && (!s.weightKg || !s.reps)
  );

  function useLastWeights() {
    if (!lastTopSet) return;
    // Fill every unsaved set with last session's top weight/reps
    exercise.sets.forEach((s, idx) => {
      if (s.isSaved) return;
      if (!s.weightKg) onUpdateField(idx, "weightKg", String(lastTopSet.weight));
      if (!s.reps)     onUpdateField(idx, "reps",     String(lastTopSet.reps));
    });
  }

  return (
    <div className={styles.block}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.info}>
          <h3 className={styles.name}>{exercise.name}</h3>
          {exercise.muscleGroups.length > 0 && (
            <p className={styles.muscles}>{exercise.muscleGroups.join(", ")}</p>
          )}
          <div className={styles.historyLine}>
            {pr && pr.weight > 0 && (
              <span className={styles.prChip} title={`Estimated 1RM: ${pr.estimated1rm}kg`}>
                🏆 PR {pr.weight}kg × {pr.reps}
              </span>
            )}
            {lastTopSet && (
              <span className={styles.lastChip}>
                Last {lastTopSet.weight}kg × {lastTopSet.reps}
              </span>
            )}
          </div>
          {nudge && (
            <p className={styles.nudge}>
              💡 Try <b>{nudge.suggestWeight}kg</b> — {nudge.reason}
            </p>
          )}
          {hasEmptyUnsavedSet && (
            <button type="button" className={styles.useLastBtn} onClick={useLastWeights}>
              ↻ Use last weights
            </button>
          )}
        </div>
        <div className={styles.menuWrapper}>
          <button
            className={styles.menuBtn}
            onClick={() => setShowMenu((v) => !v)}
            type="button"
            aria-label="Exercise options"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="5"  r="1.5" fill="var(--text-tertiary)" />
              <circle cx="12" cy="12" r="1.5" fill="var(--text-tertiary)" />
              <circle cx="12" cy="19" r="1.5" fill="var(--text-tertiary)" />
            </svg>
          </button>
          {showMenu && (
            <div className={styles.menu}>
              <button
                className={styles.menuItem}
                onClick={() => { onRemove(); setShowMenu(false); }}
                type="button"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="var(--accent-red)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Remove Exercise
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Note field */}
      <div className={styles.noteWrap}>
        <textarea
          className={styles.noteInput}
          placeholder="Add a note..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={1}
        />
      </div>

      {/* Column labels — default to KG/REPS for any non-special type so a
          legacy exercise with an unexpected `measurement_type` still gets
          the right table header (matches the SetRow safety fallback). */}
      {exercise.sets.length > 0 && (() => {
        const t = exercise.measurementType;
        const isCardio = t === "cardio";
        const isTimed = t === "timed";
        const isRepsOnly = t === "bodyweight_reps" || t === "reps_only";
        const isWeightReps = !isCardio && !isTimed && !isRepsOnly;
        const dataType = isWeightReps ? "weight_reps" : t;
        return (
          <div className={styles.colLabels} data-type={dataType}>
            {!isCardio && <span>SET</span>}
            {!isCardio && <span>PREV</span>}
            {isWeightReps && <><span>KG</span><span>REPS</span></>}
            {isRepsOnly  && <span>REPS</span>}
            {isTimed     && <span>SEC</span>}
            {isCardio    && <span>MIN</span>}
            <span />
          </div>
        );
      })()}

      {/* Sets */}
      {exercise.sets.map((set, idx) => (
        <SetRow
          key={set.id ?? `new-${idx}`}
          set={set}
          index={idx}
          weId={exercise.weId}
          prevSet={exercise.previousSets[idx]}
          measurementType={exercise.measurementType}
          onUpdateField={(field, value) => onUpdateField(idx, field, value)}
          onSave={() => onSaveSet(idx)}
          onDelete={onDeleteSet}
        />
      ))}

      {/* Add set button */}
      <button className={styles.addSetBtn} onClick={onAddSet} type="button">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M12 5v14M5 12h14" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        Add Set
      </button>
    </div>
  );
}
