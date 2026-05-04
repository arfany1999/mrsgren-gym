"use client";

import { useState, useMemo } from "react";
import { SetRow } from "@/components/workout/SetRow/SetRow";
import { progressiveOverloadHint } from "@/lib/exerciseHistory";
import { generateWarmupSets } from "@/lib/warmupGenerator";
import { calculatePlates, formatPlates } from "@/lib/plateCalculator";
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
  const [showWarmup, setShowWarmup] = useState(false);
  const [showPlateCalc, setShowPlateCalc] = useState(false);
  const [plateCalcWeight, setPlateCalcWeight] = useState("");

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
  const isWeightReps = exercise.measurementType === "weight_reps";
  // Only show "Use last weights" when at least one unsaved set is missing a value
  const hasEmptyUnsavedSet = !!lastTopSet && exercise.sets.some(s =>
    !s.isSaved && (!s.weightKg || !s.reps)
  );

  // Derive the working weight for warmup / plate calc defaults
  const workingWeight = useMemo(() => {
    // First set's weight takes priority, then last top set
    const firstSetW = parseFloat(exercise.sets[0]?.weightKg ?? "");
    if (firstSetW > 0) return firstSetW;
    return lastTopSet?.weight ?? 0;
  }, [exercise.sets, lastTopSet]);

  const workingReps = useMemo(() => {
    const firstSetR = parseInt(exercise.sets[0]?.reps ?? "");
    if (firstSetR > 0) return firstSetR;
    return lastTopSet?.reps ?? 5;
  }, [exercise.sets, lastTopSet]);

  // Generate warmup sets when visible
  const warmupSets = useMemo(() => {
    if (!showWarmup || !isWeightReps || workingWeight <= 0) return [];
    return generateWarmupSets(workingWeight, workingReps);
  }, [showWarmup, isWeightReps, workingWeight, workingReps]);

  // Plate calculator result
  const plateCalcResult = useMemo(() => {
    if (!showPlateCalc) return null;
    const w = parseFloat(plateCalcWeight);
    if (!w || w <= 0) return null;
    const result = calculatePlates(w);
    return { ...result, formatted: formatPlates(result.perSide) };
  }, [showPlateCalc, plateCalcWeight]);

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
              {isWeightReps && (
                <button
                  className={styles.menuItemDefault}
                  onClick={() => {
                    setShowWarmup(v => !v);
                    if (!plateCalcWeight && workingWeight > 0) {
                      setPlateCalcWeight(String(workingWeight));
                    }
                    setShowMenu(false);
                  }}
                  type="button"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M12 3v18M3 12l4-4m-4 4l4 4M21 12l-4-4m4 4l-4 4" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {showWarmup ? "Hide Warmup Sets" : "Warmup Sets"}
                </button>
              )}
              {isWeightReps && (
                <button
                  className={styles.menuItemDefault}
                  onClick={() => {
                    setShowPlateCalc(v => !v);
                    if (!plateCalcWeight && workingWeight > 0) {
                      setPlateCalcWeight(String(workingWeight));
                    }
                    setShowMenu(false);
                  }}
                  type="button"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="6" width="4" height="12" rx="1" stroke="var(--accent)" strokeWidth="1.8" />
                    <rect x="18" y="6" width="4" height="12" rx="1" stroke="var(--accent)" strokeWidth="1.8" />
                    <line x1="6" y1="12" x2="18" y2="12" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                  {showPlateCalc ? "Hide Plate Calculator" : "Plate Calculator"}
                </button>
              )}
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

      {/* Warmup Sets Section */}
      {showWarmup && isWeightReps && warmupSets.length > 0 && (
        <div className={styles.warmupSection}>
          <div className={styles.warmupHeader}>
            <span className={styles.warmupTitle}>Warmup Sets</span>
            <button
              className={styles.warmupDismiss}
              onClick={() => setShowWarmup(false)}
              type="button"
              aria-label="Dismiss warmup sets"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          {warmupSets.map((ws, i) => {
            const plates = calculatePlates(ws.weight);
            return (
              <div key={i} className={styles.warmupRow}>
                <span className={styles.warmupLabel}>{ws.label}</span>
                <span className={styles.warmupWeight}>{ws.weight}kg</span>
                <span className={styles.warmupReps}>{ws.reps}r</span>
                <span className={styles.warmupPlates}>
                  {plates.perSide.length > 0
                    ? plates.perSide.map((p, j) => (
                        <span key={j} className={styles.warmupPlatePill}>
                          {p.count}&times;{p.plate}
                        </span>
                      ))
                    : <span>Bar only</span>
                  }
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Plate Calculator Panel */}
      {showPlateCalc && isWeightReps && (
        <div className={styles.plateCalcPanel}>
          <div className={styles.plateCalcHeader}>
            <span className={styles.plateCalcTitle}>Plate Calculator</span>
            <button
              className={styles.plateCalcDismiss}
              onClick={() => setShowPlateCalc(false)}
              type="button"
              aria-label="Dismiss plate calculator"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className={styles.plateInputRow}>
            <span className={styles.plateInputLabel}>Weight</span>
            <input
              className={styles.plateInput}
              type="number"
              inputMode="decimal"
              value={plateCalcWeight}
              onChange={(e) => setPlateCalcWeight(e.target.value)}
              placeholder="0"
              min={0}
            />
            <span className={styles.plateInputUnit}>kg</span>
          </div>
          <div className={styles.plateResult}>
            {plateCalcResult ? (
              <>
                <div className={styles.plateResultLine}>
                  <span className={styles.plateResultLabel}>Bar</span>
                  <span className={styles.plateBarInfo}>20 kg</span>
                </div>
                <div className={styles.plateResultLine}>
                  <span className={styles.plateResultLabel}>Per side</span>
                  {plateCalcResult.perSide.length > 0 ? (
                    <div className={styles.platePills}>
                      {plateCalcResult.perSide.map((p, i) => (
                        <span key={i} className={styles.platePill}>
                          {p.count}&times;{p.plate}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className={styles.plateNoPlates}>No plates needed</span>
                  )}
                </div>
                {plateCalcResult.remainder > 0 && (
                  <div className={styles.plateResultLine}>
                    <span className={styles.plateResultLabel}>Remainder</span>
                    <span className={styles.plateRemainder}>
                      {plateCalcResult.remainder} kg cannot be loaded
                    </span>
                  </div>
                )}
              </>
            ) : (
              <span className={styles.plateNoPlates}>
                Enter a weight above to see the plate breakdown
              </span>
            )}
          </div>
        </div>
      )}

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
            {isCardio    && <><span>MIN</span><span>KM</span></>}
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
          previousBest={exercise.previousBest}
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
        {exercise.measurementType === "cardio" ? "Add Session" : "Add Set"}
      </button>
    </div>
  );
}
