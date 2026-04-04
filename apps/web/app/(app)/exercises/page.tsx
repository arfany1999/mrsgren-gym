"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar/TopBar";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import { ExerciseAnimation } from "@/components/ui/ExerciseAnimation/ExerciseAnimation";
import { browseExercises, searchFreeExercises } from "@/lib/freeExerciseDb";
import type { FreeExercise } from "@/lib/freeExerciseDb";
import styles from "./page.module.css";

const MUSCLE_GROUPS = [
  "All",
  "chest",
  "biceps",
  "triceps",
  "shoulders",
  "lats",
  "middle back",
  "lower back",
  "traps",
  "forearms",
  "abdominals",
  "glutes",
  "hamstrings",
  "quadriceps",
  "calves",
];

const PAGE_SIZE = 50;

export default function ExercisesPage() {
  const [allExercises, setAllExercises] = useState<FreeExercise[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState("All");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load paginated browse list
  const loadPage = useCallback(async (off: number, replace: boolean) => {
    if (off === 0) setLoading(true);
    else setLoadingMore(true);
    try {
      const { exercises, total: t } = await browseExercises({ limit: PAGE_SIZE, offset: off });
      setAllExercises((prev) => replace ? exercises : [...prev, ...exercises]);
      setTotal(t);
      setOffset(off + exercises.length);
    } catch {
      // keep existing
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Search by name
  const doSearch = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const exercises = await searchFreeExercises(q);
      setAllExercises(exercises);
      setTotal(exercises.length);
      setOffset(exercises.length);
    } catch {
      setAllExercises([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadPage(0, true);
  }, [loadPage]);

  // Debounced search / reset to browse
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!query) {
      loadPage(0, true);
      return;
    }
    searchTimer.current = setTimeout(() => doSearch(query), 300);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [query, doSearch, loadPage]);

  // Derived: apply muscle filter client-side
  const displayed =
    muscle === "All"
      ? allExercises
      : allExercises.filter((ex) =>
          [...ex.primaryMuscles, ...ex.secondaryMuscles].some(
            (m) => m.toLowerCase() === muscle.toLowerCase()
          )
        );

  const canLoadMore = !query && offset < total;

  return (
    <div className={styles.page}>
      <TopBar
        title="Exercises"
        rightAction={
          <Link href="/exercises/new" className={styles.addBtn}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 5v14M5 12h14"
                stroke="var(--accent)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </Link>
        }
      />

      {/* Search */}
      <div className={styles.searchWrapper}>
        <svg
          className={styles.searchIcon}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle cx="11" cy="11" r="8" stroke="var(--text-tertiary)" strokeWidth="2" />
          <path d="M21 21l-4.35-4.35" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          className={styles.searchInput}
          type="text"
          placeholder="Search exercises..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button className={styles.clearBtn} onClick={() => setQuery("")} type="button">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      {/* Muscle Filters */}
      <div className={styles.filtersScroll}>
        {MUSCLE_GROUPS.map((m) => (
          <button
            key={m}
            className={[styles.filterChip, muscle === m ? styles.activeChip : ""].join(" ")}
            onClick={() => setMuscle(m)}
            type="button"
          >
            {m === "All" ? "All" : m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>

      {/* Count */}
      <div className={styles.countRow}>
        <p className={styles.count}>{displayed.length} exercises</p>
      </div>

      {/* List */}
      {loading ? (
        <div className={styles.loadingCenter}>
          <Spinner size={28} />
        </div>
      ) : displayed.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyText}>No exercises found</p>
        </div>
      ) : (
        <>
          <ul className={styles.list}>
            {displayed.map((ex) => (
              <li key={ex.id}>
                <Link href={`/exercises/${encodeURIComponent(ex.id)}`} className={styles.item}>
                  <div className={styles.mapWrap}>
                    <ExerciseAnimation name={ex.name} muscles={ex.primaryMuscles} variant="thumb" />
                  </div>
                  <div className={styles.itemInfo}>
                    <p className={styles.itemName}>{ex.name}</p>
                    {ex.primaryMuscles.length > 0 && (
                      <p className={styles.itemMuscles}>
                        {ex.primaryMuscles
                          .slice(0, 3)
                          .map((m) => m.charAt(0).toUpperCase() + m.slice(1))
                          .join(" · ")}
                      </p>
                    )}
                  </div>
                  <div className={styles.itemRight}>
                    {ex.equipment && (
                      <span className={styles.equipTag}>{ex.equipment}</span>
                    )}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                      <path d="M9 18l6-6-6-6" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {canLoadMore && (
            <div className={styles.loadMoreRow}>
              <button
                className={styles.loadMoreBtn}
                onClick={() => loadPage(offset, false)}
                disabled={loadingMore}
                type="button"
              >
                {loadingMore ? <Spinner size={16} /> : "Load more"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
