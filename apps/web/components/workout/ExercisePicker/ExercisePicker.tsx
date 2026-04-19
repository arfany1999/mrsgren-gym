"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet/BottomSheet";
import { BodyMuscleIcon } from "@/components/ui/BodyMuscleIcon/BodyMuscleIcon";
import { browseExercises, searchFreeExercises } from "@/lib/freeExerciseDb";
import type { FreeExercise } from "@/lib/freeExerciseDb";
import type { Exercise } from "@/types/api";
import styles from "./ExercisePicker.module.css";

interface ExercisePickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (exercise: Exercise) => void;
}

const MUSCLE_CHIPS = [
  { label: "All",        bodyPart: "" },
  { label: "Chest",      bodyPart: "chest" },
  { label: "Lats",       bodyPart: "lats" },
  { label: "Shoulders",  bodyPart: "shoulders" },
  { label: "Biceps",     bodyPart: "biceps" },
  { label: "Triceps",    bodyPart: "triceps" },
  { label: "Abs",        bodyPart: "abdominals" },
  { label: "Quads",      bodyPart: "quadriceps" },
  { label: "Hamstrings", bodyPart: "hamstrings" },
  { label: "Glutes",     bodyPart: "glutes" },
  { label: "Calves",     bodyPart: "calves" },
];

export function ExercisePicker({ open, onClose, onSelect }: ExercisePickerProps) {
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState("");
  const [exercises, setExercises] = useState<FreeExercise[]>([]);
  const [loading, setLoading] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (q: string, bodyPart: string) => {
    setLoading(true);
    try {
      if (q) {
        const results = await searchFreeExercises(q);
        setExercises(results);
      } else {
        const { exercises } = await browseExercises({ limit: 80, offset: 0, muscle: bodyPart || undefined });
        setExercises(exercises);
      }
    } catch {
      setExercises([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) load("", "");
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!query) { load("", muscle); return; }
    searchTimer.current = setTimeout(() => load(query, muscle), 300);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [query, muscle, open, load]);

  function handleSelect(freeEx: FreeExercise) {
    const exercise: Exercise = {
      id: freeEx.id,
      name: freeEx.name,
      muscleGroups: [...freeEx.primaryMuscles, ...freeEx.secondaryMuscles],
      equipment: freeEx.equipment || null,
      instructions: freeEx.instructions.join("\n"),
      videoUrl: null,
      isCustom: false,
      createdByUserId: null,
    };
    onSelect(exercise);
    onClose();
    setQuery("");
    setMuscle("");
  }

  function handleClose() {
    onClose();
    setQuery("");
    setMuscle("");
  }

  function handleMuscle(bodyPart: string) {
    setMuscle(bodyPart);
    setQuery("");
  }

  return (
    <BottomSheet open={open} onClose={handleClose} title="Add Exercise" height="90dvh">
      <div className={styles.inner}>
        {/* Search */}
        <div className={styles.searchWrapper}>
          <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="var(--text-tertiary)" strokeWidth="2" />
            <path d="M21 21l-4.35-4.35" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Search exercises..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus={open}
          />
          {query && (
            <button className={styles.clearBtn} onClick={() => setQuery("")} type="button">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>

        {/* Muscle chips */}
        <div className={styles.chipsRow}>
          {MUSCLE_CHIPS.map((chip) => (
            <button
              key={chip.bodyPart}
              type="button"
              className={[styles.chip, muscle === chip.bodyPart ? styles.chipActive : ""].join(" ")}
              onClick={() => handleMuscle(chip.bodyPart)}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className={styles.empty}>
            <p className={styles.emptyText}>Loading...</p>
          </div>
        ) : exercises.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyText}>No exercises found</p>
          </div>
        ) : (
          <ul className={styles.list}>
            {exercises.map((ex) => (
              <li key={ex.id}>
                <button className={styles.item} onClick={() => handleSelect(ex)} type="button">
                  <div className={styles.mapWrap}>
                    <BodyMuscleIcon muscles={ex.primaryMuscles} variant="thumb" />
                  </div>
                  <div className={styles.info}>
                    <p className={styles.itemName}>{ex.name}</p>
                    {ex.primaryMuscles.length > 0 && (
                      <p className={styles.itemMuscles}>
                        {ex.primaryMuscles.slice(0, 3).map((m) => m.charAt(0).toUpperCase() + m.slice(1)).join(" · ")}
                      </p>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </BottomSheet>
  );
}
