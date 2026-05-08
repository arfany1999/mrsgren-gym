"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import {
  getExerciseProgression,
  type ExerciseProgression,
  type ProgressionSession,
  type LifetimeBests,
} from "@/lib/api/exerciseProgress";
import styles from "./ExerciseProgress.module.css";

interface ExerciseProgressProps {
  exerciseName: string;
}

// SVG line chart of estimated-1RM over time. Pure SVG keeps the bundle
// tiny — no chart library — and the styling stays in CSS modules. Y-axis
// labels show min/max; x-axis is implied (left = earlier, right = later).
function ProgressChart({ sessions }: { sessions: ProgressionSession[] }) {
  if (sessions.length < 2) return null;

  const W = 320, H = 140, PAD_X = 8, PAD_Y = 14;
  const points = sessions
    .filter((s) => s.bestE1RM > 0)
    .map((s) => ({ date: s.date, value: s.bestE1RM }));
  if (points.length < 2) return null;

  const min = Math.min(...points.map((p) => p.value));
  const max = Math.max(...points.map((p) => p.value));
  const range = max - min || 1;

  const innerW = W - PAD_X * 2;
  const innerH = H - PAD_Y * 2;
  const xy = points.map((p, i) => {
    const x = PAD_X + (i / (points.length - 1)) * innerW;
    const y = PAD_Y + innerH - ((p.value - min) / range) * innerH;
    return [x, y] as const;
  });
  const lastPt = xy[xy.length - 1]!;

  const polyPoints = xy.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaPath = `M ${PAD_X},${H - PAD_Y} L ${polyPoints.replace(/ /g, " L ")} L ${(PAD_X + innerW).toFixed(1)},${H - PAD_Y} Z`;

  return (
    <div className={styles.chartCard}>
      <div className={styles.chartHead}>
        <span className={styles.chartTitle}>Estimated 1RM</span>
        <span className={styles.chartRange}>{points.length} sessions</span>
      </div>
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        className={styles.chartSvg}
        role="img"
        aria-label={`Estimated 1RM trend across ${points.length} sessions: ${min.toFixed(1)} kg to ${max.toFixed(1)} kg`}
      >
        <defs>
          <linearGradient id="e1rmFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.32" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* baseline gridline */}
        <line
          x1={PAD_X} x2={W - PAD_X}
          y1={PAD_Y + innerH} y2={PAD_Y + innerH}
          stroke="rgba(255,255,255,0.06)" strokeWidth="1"
        />
        <path d={areaPath} fill="url(#e1rmFill)" />
        <polyline
          points={polyPoints}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* leading-edge dot */}
        <circle cx={lastPt[0]} cy={lastPt[1]} r="3.5" fill="var(--accent)" />
        <circle cx={lastPt[0]} cy={lastPt[1]} r="6" fill="var(--accent)" opacity="0.25" />
      </svg>
      <div className={styles.chartFoot}>
        <span className={styles.chartMin}>{min.toFixed(1)} kg</span>
        <span className={styles.chartMax}>{max.toFixed(1)} kg</span>
      </div>
    </div>
  );
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtRelative(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function BestsRow({ bests }: { bests: LifetimeBests }) {
  if (!bests.heaviestSet && !bests.bestE1RM) return null;
  return (
    <div className={styles.bestsRow}>
      {bests.heaviestSet && (
        <div className={styles.bestCard} title={`Heaviest single set, ${fmtRelative(bests.heaviestSet.date)}`}>
          <span className={styles.bestValue}>{bests.heaviestSet.weight}<small>kg</small></span>
          <span className={styles.bestLabel}>Heaviest</span>
          <span className={styles.bestSub}>× {bests.heaviestSet.reps} reps</span>
        </div>
      )}
      {bests.bestE1RM && (
        <div className={styles.bestCard} title={`Best estimated 1RM, ${fmtRelative(bests.bestE1RM.date)}`}>
          <span className={styles.bestValue}>{bests.bestE1RM.e1rm.toFixed(1)}<small>kg</small></span>
          <span className={styles.bestLabel}>Est. 1RM</span>
          <span className={styles.bestSub}>{bests.bestE1RM.weight} × {bests.bestE1RM.reps}</span>
        </div>
      )}
      {bests.mostReps && (
        <div className={styles.bestCard} title={`Most reps in a single set, ${fmtRelative(bests.mostReps.date)}`}>
          <span className={styles.bestValue}>{bests.mostReps.reps}</span>
          <span className={styles.bestLabel}>Most Reps</span>
          <span className={styles.bestSub}>@ {bests.mostReps.weight} kg</span>
        </div>
      )}
      {bests.biggestSetVolume && (
        <div className={styles.bestCard} title={`Biggest single-set volume, ${fmtRelative(bests.biggestSetVolume.date)}`}>
          <span className={styles.bestValue}>{Math.round(bests.biggestSetVolume.volume)}<small>kg</small></span>
          <span className={styles.bestLabel}>Top Set Vol</span>
          <span className={styles.bestSub}>{bests.biggestSetVolume.weight} × {bests.biggestSetVolume.reps}</span>
        </div>
      )}
    </div>
  );
}

function SessionList({ sessions }: { sessions: ProgressionSession[] }) {
  // Newest-first for the table view (the chart was oldest→newest).
  const reversed = [...sessions].reverse();
  if (reversed.length === 0) return null;

  return (
    <div className={styles.historyCard}>
      <div className={styles.historyHead}>
        <span className={styles.historyTitle}>Session history</span>
        <span className={styles.historyMeta}>{sessions.length} total</span>
      </div>
      <ul className={styles.historyList}>
        {reversed.map((s) => {
          const completed = s.sets.filter((set) => set.isCompleted);
          return (
            <li key={s.workoutId} className={styles.historyRow}>
              <div className={styles.historyDateCol}>
                <span className={styles.historyDate}>{fmtDate(s.date)}</span>
                <span className={styles.historyAgo}>{fmtRelative(s.date)}</span>
              </div>
              <div className={styles.historySetsCol}>
                {completed.length === 0 ? (
                  <span className={styles.historyEmpty}>—</span>
                ) : (
                  <div className={styles.setsChips}>
                    {completed.map((set, i) => (
                      <span key={i} className={styles.setChip}>
                        {set.reps}<small>×</small>{set.weight}<small>kg</small>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className={styles.historyTotalCol}>
                <span className={styles.historyTotalNum}>{Math.round(s.totalVolume).toLocaleString()}</span>
                <span className={styles.historyTotalLbl}>kg vol</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function ExerciseProgress({ exerciseName }: ExerciseProgressProps) {
  const { supabase, user } = useAuth();
  const [data, setData] = useState<ExerciseProgression | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    setLoading(true);
    void getExerciseProgression(supabase, user.id, exerciseName)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [supabase, user?.id, exerciseName]);

  if (loading) {
    return (
      <div className={styles.section}>
        <p className={styles.sectionLabel}>Your progression</p>
        <div className={styles.loadingCenter}><Spinner size={24} /></div>
      </div>
    );
  }

  if (!data || data.sessions.length === 0) {
    return (
      <div className={styles.section}>
        <p className={styles.sectionLabel}>Your progression</p>
        <div className={styles.emptyCard}>
          <p className={styles.emptyTitle}>No history yet</p>
          <p className={styles.emptyText}>
            Log a workout with this exercise to see weight, rep, and 1RM trends here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.section}>
      <p className={styles.sectionLabel}>Your progression</p>
      <BestsRow bests={data.bests} />
      <ProgressChart sessions={data.sessions} />
      <SessionList sessions={data.sessions} />
    </div>
  );
}
