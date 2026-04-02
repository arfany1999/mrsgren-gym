"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { TopBar } from "@/components/layout/TopBar/TopBar";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import { fetchExercises, searchExercises } from "@/lib/exercisedb";
import type { Exercise } from "@/types/api";
import styles from "./page.module.css";

const MUSCLE_GROUPS = [
  "All",
  "abs",
  "biceps",
  "calves",
  "cardiovascular system",
  "delts",
  "forearms",
  "glutes",
  "hamstrings",
  "lats",
  "pectorals",
  "quads",
  "serratus anterior",
  "spine",
  "traps",
  "triceps",
  "upper back",
];

const PAGE_SIZE = 50;

export default function ExercisesPage() {
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
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
      const { exercises, total: t } = await fetchExercises({ limit: PAGE_SIZE, offset: off });
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
      const { exercises, total: t } = await searchExercises({ q, limit: 100 });
      setAllExercises(exercises);
      setTotal(t);
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
      // Switching back from search to browse
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
          ex.muscleGroups.some((m) => m.toLowerCase() === muscle.toLowerCase())
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
                <Link href={`/exercises/${ex.id}`} className={styles.item}>
                  {ex.videoUrl && (
                    <div className={styles.gifWrap}>
                      <Image
                        src={ex.videoUrl}
                        alt={ex.name}
                        width={56}
                        height={56}
                        className={styles.gif}
                        unoptimized
                      />
                    </div>
                  )}
                  <div className={styles.itemInfo}>
                    <p className={styles.itemName}>{ex.name}</p>
                    {ex.muscleGroups.length > 0 && (
                      <p className={styles.itemMuscles}>
                        {ex.muscleGroups
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
