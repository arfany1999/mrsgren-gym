"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet/BottomSheet";
import { BodyMuscleIcon } from "@/components/ui/BodyMuscleIcon/BodyMuscleIcon";
import { browseExercises, searchFreeExercises } from "@/lib/freeExerciseDb";
import type { FreeExercise } from "@/lib/freeExerciseDb";
import type { Exercise } from "@/types/api";
import { getMeasurementType, type MeasurementType } from "@/lib/exercises-data";
import { useAuth } from "@/contexts/AuthContext";
import { hydrateRecent, pushRecent, readRecentLocal } from "@/lib/recentExercises";
import styles from "./ExercisePicker.module.css";

interface ExercisePickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (exercise: Exercise) => void;
}

const MUSCLE_CHIPS = [
  { label: "Recent",     bodyPart: "__recent" },
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

function titleCase(value: string) {
  return value
    .split(/[_\\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function ExercisePicker({ open, onClose, onSelect }: ExercisePickerProps) {
  const { supabase, user } = useAuth();
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState("");
  const [exercises, setExercises] = useState<FreeExercise[]>([]);
  const [recentExercises, setRecentExercises] = useState<FreeExercise[]>([]);
  const [loading, setLoading] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (q: string, bodyPart: string) => {
    setLoading(true);
    try {
      if (bodyPart === "__recent") {
        const recent = readRecentLocal();
        const needle = q.trim().toLowerCase();
        setExercises(needle
          ? recent.filter((ex) =>
              [
                ex.name,
                ex.equipment,
                ex.category,
                ...ex.primaryMuscles,
                ...ex.secondaryMuscles,
              ].filter(Boolean).join(" ").toLowerCase().includes(needle)
            )
          : recent
        );
      } else if (q) {
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
    if (!open) return;
    // hydrateRecent returns the localStorage list synchronously and then
    // re-fires our callback once it's merged the server-side copy in.
    const initial = hydrateRecent(supabase, user, (merged) => {
      setRecentExercises(merged);
      // If the active filter is "__recent" and we got new entries from
      // the server, refresh the visible list too.
      setExercises((prev) => {
        if (muscle !== "__recent") return prev;
        return query ? prev : merged;
      });
    });
    setRecentExercises(initial);
    load("", initial.length > 0 ? "__recent" : "");
    setMuscle(initial.length > 0 ? "__recent" : "");
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!query) { load("", muscle); return; }
    searchTimer.current = setTimeout(() => load(query, muscle), 300);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [query, muscle, open, load]);

  function handleSelect(freeEx: FreeExercise) {
    // Detect measurement type: first try our curated list, then infer from
    // the free-exercise-db category so cardio/stretching/plyometric exercises
    // from the 800+ DB always get the right input columns.
    let mType: MeasurementType = getMeasurementType(freeEx.name);
    if (mType === "weight_reps") {
      const cat = freeEx.category?.toLowerCase() ?? "";
      if (cat === "cardio") mType = "cardio";
      else if (cat === "stretching") mType = "timed";
      else if (cat === "plyometrics") mType = "reps_only";
      else if (cat === "strength" && (freeEx.equipment === "body only" || freeEx.equipment === "other"))
        mType = "bodyweight_reps";
    }

    const exercise: Exercise = {
      id: freeEx.id,
      name: freeEx.name,
      muscleGroups: [...freeEx.primaryMuscles, ...freeEx.secondaryMuscles],
      equipment: freeEx.equipment || null,
      instructions: freeEx.instructions.join("\n"),
      videoUrl: null,
      isCustom: false,
      createdByUserId: null,
      measurementType: mType,
    };
    onSelect(exercise);
    const updated = pushRecent(supabase, user, freeEx);
    setRecentExercises(updated);
    onClose();
    setQuery("");
    setMuscle(updated.length > 0 ? "__recent" : "");
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
        <div className={styles.summaryRow}>
          <div>
            <p className={styles.summaryKicker}>
              {muscle === "__recent" ? "Recent picks" : muscle ? `${titleCase(muscle)} library` : "Exercise library"}
            </p>
            <p className={styles.summaryText}>
              {loading ? "Finding matches..." : `${exercises.length} ${exercises.length === 1 ? "exercise" : "exercises"} ready`}
            </p>
          </div>
          <span className={styles.summaryBadge}>{query ? "Search" : muscle === "__recent" ? "Recent" : "Browse"}</span>
        </div>

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
          {MUSCLE_CHIPS.filter((chip) => chip.bodyPart !== "__recent" || recentExercises.length > 0).map((chip) => (
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
            <p className={styles.emptyTitle}>Loading exercises</p>
            <p className={styles.emptyText}>Building the list for this filter.</p>
          </div>
        ) : exercises.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>No exercises found</p>
            <p className={styles.emptyText}>Try another muscle group or clear the search.</p>
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
                    <div className={styles.itemMeta}>
                      {ex.equipment && <span>{titleCase(ex.equipment)}</span>}
                      <span>{titleCase(ex.category || getMeasurementType(ex.name))}</span>
                    </div>
                  </div>
                  <span className={styles.addCue} aria-hidden>+</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </BottomSheet>
  );
}
