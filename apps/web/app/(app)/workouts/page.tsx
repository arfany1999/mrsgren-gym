"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { WorkoutCard } from "@/components/workout/WorkoutCard/WorkoutCard";
import { TopBar } from "@/components/layout/TopBar/TopBar";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import { Button } from "@/components/ui/Button/Button";
import type { Workout } from "@/types/api";
import styles from "./page.module.css";

const LIMIT = 20;

export default function WorkoutsPage() {
  const { api } = useAuth();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchPage = useCallback(async (p: number) => {
    if (p === 1) setLoading(true); else setLoadingMore(true);
    try {
      const res = await api.get<{ workouts: Workout[]; total: number }>(
        `/workouts?page=${p}&limit=${LIMIT}`
      );
      setWorkouts((prev) => p === 1 ? res.workouts : [...prev, ...res.workouts]);
      setTotal(res.total);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [api]);

  useEffect(() => { fetchPage(1); }, [fetchPage]);

  const hasMore = workouts.length < total;

  function loadMore() {
    const next = page + 1;
    setPage(next);
    fetchPage(next);
  }

  return (
    <div className={styles.page}>
      <TopBar title="History" />

      {loading ? (
        <div className={styles.loadingCenter}>
          <Spinner size={32} />
        </div>
      ) : workouts.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyIcon}>📋</p>
          <p className={styles.emptyTitle}>No workouts yet</p>
          <p className={styles.emptySub}>Start a workout from the home tab</p>
        </div>
      ) : (
        <div className={styles.content}>
          <p className={styles.count}>{total} workouts</p>
          <div className={styles.list}>
            {workouts.map((w) => (
              <WorkoutCard key={w.id} workout={w} />
            ))}
          </div>
          {hasMore && (
            <div className={styles.loadMoreWrapper}>
              <Button variant="secondary" onClick={loadMore} loading={loadingMore}>
                Load More
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
