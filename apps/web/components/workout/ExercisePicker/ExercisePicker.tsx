"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { BottomSheet } from "@/components/ui/BottomSheet/BottomSheet";
import { fetchExercises, searchExercises } from "@/lib/exercisedb";
import type { Exercise } from "@/types/api";
import styles from "./ExercisePicker.module.css";

interface ExercisePickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (exerciseId: string) => void;
}

export function ExercisePicker({ open, onClose, onSelect }: ExercisePickerProps) {
  const [query, setQuery] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const result = q
        ? await searchExercises({ q, limit: 50 })
        : await fetchExercises({ limit: 50, offset: 0 });
      setExercises(result.exercises);
    } catch {
      setExercises([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) load("");
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!query) { load(""); return; }
    searchTimer.current = setTimeout(() => load(query), 300);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [query, open, load]);

  function handleSelect(id: string) {
    onSelect(id);
    onClose();
    setQuery("");
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Add Exercise" height="90dvh">
      <div className={styles.inner}>
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
                <button className={styles.item} onClick={() => handleSelect(ex.id)} type="button">
                  {ex.videoUrl && (
                    <div className={styles.gifWrap}>
                      <Image
                        src={ex.videoUrl}
                        alt={ex.name}
                        width={44}
                        height={44}
                        className={styles.gif}
                        unoptimized
                      />
                    </div>
                  )}
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
