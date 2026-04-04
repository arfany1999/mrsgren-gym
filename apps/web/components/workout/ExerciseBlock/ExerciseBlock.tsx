"use client";

import { useState } from "react";
import { SetRow } from "@/components/workout/SetRow/SetRow";
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

  return (
    <div className={styles.block}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.info}>
          <h3 className={styles.name}>{exercise.name}</h3>
          {exercise.muscleGroups.length > 0 && (
            <p className={styles.muscles}>{exercise.muscleGroups.join(", ")}</p>
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

      {/* Column labels */}
      {exercise.sets.length > 0 && (
        <div className={styles.colLabels} data-type={exercise.measurementType}>
          {exercise.measurementType !== "cardio" && <span>SET</span>}
          {exercise.measurementType !== "cardio" && <span>PREV</span>}
          {exercise.measurementType === "weight_reps" && <><span>KG</span><span>REPS</span></>}
          {(exercise.measurementType === "bodyweight_reps" || exercise.measurementType === "reps_only") && <span>REPS</span>}
          {exercise.measurementType === "timed"  && <span>SEC</span>}
          {exercise.measurementType === "cardio" && <><span>MIN</span><span>KM</span></>}
          <span />
        </div>
      )}

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
