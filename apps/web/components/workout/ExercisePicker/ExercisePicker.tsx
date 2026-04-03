"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet/BottomSheet";
import { MuscleMap } from "@/components/ui/MuscleMap/MuscleMap";
import { fetchExercises, searchExercises } from "@/lib/exercisedb";
import type { Exercise } from "@/types/api";
import styles from "./ExercisePicker.module.css";

interface ExercisePickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (exercise: Exercise) => void;
}

const MUSCLE_CHIPS = [
  { label: "All",       bodyPart: "" },
  { label: "Chest",     bodyPart: "chest" },
  { label: "Back",      bodyPart: "back" },
  { label: "Shoulders", bodyPart: "shoulders" },
  { label: "Upper Arms",bodyPart: "upper arms" },
  { label: "Lower Arms",bodyPart: "lower arms" },
  { label: "Upper Legs",bodyPart: "upper legs" },
  { label: "Lower Legs",bodyPart: "lower legs" },
  { label: "Waist",     bodyPart: "waist" },
  { label: "Cardio",    bodyPart: "cardio" },
];

export function ExercisePicker({ open, onClose, onSelect }: ExercisePickerProps) {
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (q: string, bodyPart: string) => {
    setLoading(true);
    try {
      const searchTerm = q || bodyPart;
      const result = searchTerm
        ? await searchExercises({ q: searchTerm, limit: 80 })
        : await fetchExercises({ limit: 80, offset: 0 });
      setExercises(result.exercises);
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

  function handleSelect(exercise: Exercise) {
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
                    <MuscleMap muscles={ex.muscleGroups} variant="compact" />
                  </div>
                  <div className={styles.info}>
                    <p className={styles.itemName}>{ex.name}</p>
                    {ex.muscleGroups.length > 0 && (
                      <p className={styles.itemMuscles}>
                        {ex.muscleGroups.slice(0, 3).map((m) => m.charAt(0).toUpperCase() + m.slice(1)).join(" · ")}
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
