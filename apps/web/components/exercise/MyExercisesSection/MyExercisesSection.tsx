"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import { listMyExercises, type MyExerciseSummary } from "@/lib/api/myExercises";
import styles from "./MyExercisesSection.module.css";

function fmtRelative(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7)   return `${days}d ago`;
  if (days < 30)  return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function muscleLabel(muscles: string[]): string | null {
  const first = muscles[0];
  if (!first) return null;
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

// Tiny SVG sparkline of est-1RM, oldest → newest. Same visual language as
// the PR cards on /statistics.
function MiniSparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const W = 60, H = 18;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 2) - 1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const lastPt = pts[pts.length - 1]!.split(",");
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className={styles.spark} aria-hidden>
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
      />
      <circle cx={parseFloat(lastPt[0]!)} cy={parseFloat(lastPt[1]!)} r="2" fill="var(--accent)" />
    </svg>
  );
}

export function MyExercisesSection() {
  const { supabase, user } = useAuth();
  const [items, setItems] = useState<MyExerciseSummary[] | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    void listMyExercises(supabase, user.id).then((rows) => {
      if (!cancelled) setItems(rows);
    });
    return () => { cancelled = true; };
  }, [supabase, user?.id]);

  if (items === null) {
    return (
      <div className={styles.section}>
        <div className={styles.headRow}>
          <p className={styles.sectionLabel}>Your trained exercises</p>
        </div>
        <div className={styles.loadingCenter}><Spinner size={20} /></div>
      </div>
    );
  }
  if (items.length === 0) return null;

  // Default to top 4 most-recent; user can expand to see the full list.
  const visible = showAll ? items : items.slice(0, 4);

  return (
    <div className={styles.section}>
      <div className={styles.headRow}>
        <p className={styles.sectionLabel}>
          Your trained exercises <span className={styles.count}>· {items.length}</span>
        </p>
        {items.length > 4 && (
          <button
            type="button"
            className={styles.toggleBtn}
            onClick={() => setShowAll((v) => !v)}
          >
            {showAll ? "Show top 4" : `Show all ${items.length}`}
          </button>
        )}
      </div>
      <div className={styles.grid}>
        {visible.map((ex) => (
          <Link
            key={ex.exerciseId}
            href={`/exercises/${encodeURIComponent(ex.name)}`}
            className={styles.card}
          >
            <div className={styles.cardTop}>
              <span className={styles.cardName}>{ex.name}</span>
              {muscleLabel(ex.muscleGroups) && (
                <span className={styles.cardMuscle}>{muscleLabel(ex.muscleGroups)}</span>
              )}
            </div>
            <div className={styles.cardMid}>
              {ex.bestSet && (
                <span className={styles.cardBest}>
                  Best <b>{ex.bestSet.weight}kg × {ex.bestSet.reps}</b>
                </span>
              )}
              <MiniSparkline values={ex.trend} />
            </div>
            <div className={styles.cardFoot}>
              <span className={styles.cardSessions}>{ex.sessionCount} session{ex.sessionCount === 1 ? "" : "s"}</span>
              {ex.lastTrainedAt && (
                <span className={styles.cardWhen}>· {fmtRelative(ex.lastTrainedAt)}</span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
