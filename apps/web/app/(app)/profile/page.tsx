"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button/Button";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import { formatDateFull } from "@/lib/formatters";
import { getReports, type WorkoutReportEntry } from "@/lib/gymProfile";
import styles from "./page.module.css";

type Segment = "Duration" | "Volume" | "Reps";

function formatDuration(mins: number): string {
  if (mins < 1)  return "< 1 min";
  if (mins < 60) return `${Math.round(mins)} min`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default function ProfilePage() {
  const { profile, user, supabase, logout } = useAuth();
  const [totalWorkouts,  setTotalWorkouts]  = useState(0);
  const [loading,        setLoading]        = useState(true);
  const [loggingOut,     setLoggingOut]     = useState(false);
  const [activeSegment,  setActiveSegment]  = useState<Segment>("Duration");
  const [chartValues,    setChartValues]    = useState<number[]>([0, 0, 0, 0]);
  const [chartLabel,     setChartLabel]     = useState("0 hours this week");
  const [historyOpen,    setHistoryOpen]    = useState(false);
  const [reports,        setReports]        = useState<WorkoutReportEntry[]>([]);

  const fetchChartData = useCallback(async (segment: Segment) => {
    const now  = new Date();
    const from = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000).toISOString();

    if (segment === "Reps") {
      const { data } = await supabase
        .from("workouts")
        .select("started_at, workout_exercises(workout_sets(reps))")
        .not("finished_at", "is", null)
        .gte("started_at", from);

      const weeks = [0, 0, 0, 0];
      (data ?? []).forEach((w: Record<string, unknown>) => {
        const idx = Math.min(
          Math.floor((now.getTime() - new Date(w.started_at as string).getTime()) / (7 * 24 * 60 * 60 * 1000)), 3);
        const wes = (w.workout_exercises as Record<string, unknown>[]) ?? [];
        wes.forEach((we) => {
          const sets = (we.workout_sets as Record<string, unknown>[]) ?? [];
          sets.forEach((s) => { weeks[idx] = (weeks[idx] ?? 0) + ((s.reps as number) ?? 0); });
        });
      });
      const vals = [...weeks].reverse();
      setChartValues(vals);
      setChartLabel(`${(vals[3] ?? 0).toLocaleString()} reps this week`);
    } else {
      const { data } = await supabase
        .from("workouts")
        .select("started_at, duration_secs, total_volume")
        .not("finished_at", "is", null)
        .gte("started_at", from);

      const weeks = [0, 0, 0, 0];
      (data ?? []).forEach((w: Record<string, unknown>) => {
        const idx = Math.min(
          Math.floor((now.getTime() - new Date(w.started_at as string).getTime()) / (7 * 24 * 60 * 60 * 1000)), 3);
        if (segment === "Duration") {
          weeks[idx] = (weeks[idx] ?? 0) + (((w.duration_secs as number) ?? 0) / 3600);
        } else {
          weeks[idx] = (weeks[idx] ?? 0) + ((w.total_volume as number) ?? 0);
        }
      });
      const vals = [...weeks].reverse();
      setChartValues(vals);
      setChartLabel(segment === "Duration"
        ? `${(vals[3] ?? 0).toFixed(1)} hours this week`
        : `${Math.round(vals[3] ?? 0).toLocaleString()} kg this week`);
    }
  }, [supabase]);

  useEffect(() => {
    async function load() {
      try {
        const { count } = await supabase
          .from("workouts")
          .select("id", { count: "exact", head: true })
          .not("finished_at", "is", null);
        setTotalWorkouts(count ?? 0);
        await fetchChartData("Duration");
      } finally {
        setLoading(false);
      }
    }
    load();
    // Load reports from localStorage
    if (user?.email) {
      setReports(getReports(user.email));
    }
  }, [supabase, fetchChartData, user?.email]);

  async function handleSegment(seg: Segment) {
    setActiveSegment(seg);
    await fetchChartData(seg);
  }

  async function handleLogout() {
    setLoggingOut(true);
    try { await logout(); } finally { setLoggingOut(false); }
  }

  const joinDate     = user?.created_at ? formatDateFull(user.created_at) : "—";
  const displayName  = profile?.name || (user?.user_metadata?.name as string) || user?.email?.split("@")[0] || "Athlete";
  const displayUsername = profile?.username || (user?.user_metadata?.username as string) || user?.email?.split("@")[0] || null;
  const displayEmail = profile?.email || user?.email || "—";
  const maxVal       = Math.max(...chartValues, 1);

  const TILES = [
    { label: "Routines",   href: "/routines",   icon: "🏋️" },
    { label: "Statistics", href: "/statistics",  icon: "📊" },
    { label: "Exercises",  href: "/exercises",   icon: "💪" },
    { label: "Calendar",   href: "/workouts",    icon: "📅" },
  ];

  return (
    <div className={styles.page}>
      {/* History full-screen overlay */}
      {historyOpen && (
        <div className={styles.historyOverlay}>
          <div className={styles.historyTopBar}>
            <button
              type="button"
              className={styles.historyBackBtn}
              onClick={() => setHistoryOpen(false)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <span className={styles.historyTitle}>Workout History</span>
          </div>

          <div className={styles.historyList}>
            {reports.length === 0 ? (
              <div className={styles.historyEmpty}>
                <p className={styles.historyEmptyEmoji}>📋</p>
                <p className={styles.historyEmptyText}>No workout reports yet</p>
                <p className={styles.historyEmptyHint}>Finish a workout to see your reports here</p>
              </div>
            ) : (
              reports.map(r => (
                <div key={r.id} className={styles.historyCard}>
                  {/* Card header */}
                  <div className={styles.hCardHeader}>
                    <div className={styles.hCardLeft}>
                      <span className={styles.hDayBadge}>Day {r.dayNumber}</span>
                      <p className={styles.hTitle}>{r.title}</p>
                      <p className={styles.hDate}>{formatDate(r.date)}</p>
                    </div>
                    <div className={styles.hCalsBig}>
                      <span className={styles.hCalsNum}>{r.totalCalories.toLocaleString()}</span>
                      <span className={styles.hCalsUnit}>kcal</span>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className={styles.hStats}>
                    <div className={styles.hStat}>
                      <span className={styles.hStatVal}>{formatDuration(r.durationMins)}</span>
                      <span className={styles.hStatLbl}>Duration</span>
                    </div>
                    <div className={styles.hStatDivider} />
                    <div className={styles.hStat}>
                      <span className={styles.hStatVal}>{r.exercises.length}</span>
                      <span className={styles.hStatLbl}>Exercises</span>
                    </div>
                    <div className={styles.hStatDivider} />
                    <div className={styles.hStat}>
                      <span className={styles.hStatVal}>{r.totalSets}</span>
                      <span className={styles.hStatLbl}>Sets</span>
                    </div>
                    {r.totalVolume > 0 && (
                      <>
                        <div className={styles.hStatDivider} />
                        <div className={styles.hStat}>
                          <span className={styles.hStatVal}>{Math.round(r.totalVolume).toLocaleString()} kg</span>
                          <span className={styles.hStatLbl}>Volume</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Exercise list */}
                  <div className={styles.hExList}>
                    {r.exercises.map((ex, i) => (
                      <div key={i} className={styles.hExRow}>
                        <div className={styles.hExDot} />
                        <span className={styles.hExName}>{ex.name}</span>
                        <span className={styles.hExDetail}>
                          {ex.sets} set{ex.sets !== 1 ? "s" : ""}
                          {ex.setSummary ? ` · ${ex.setSummary.split(" · ")[0]}…` : ""}
                        </span>
                        <span className={styles.hExCals}>{ex.calories} kcal</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Main profile content ── */}
      <header className={styles.header}>
        <h1 className={styles.headerName}>{displayUsername || displayName}</h1>
        <div className={styles.headerActions}>
          <button type="button" className={styles.iconBtn} aria-label="Edit">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M4 20h4l10-10-4-4L4 16v4z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <Link href="/settings" className={styles.iconBtn} aria-label="Settings">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M19 12a7 7 0 00-.07-1l2-1.5-2-3.5-2.4 1a7.6 7.6 0 00-1.7-1L14.5 3h-5l-.34 2.5a7.6 7.6 0 00-1.7 1l-2.4-1-2 3.5 2 1.5a7 7 0 000 2l-2 1.5 2 3.5 2.4-1a7.6 7.6 0 001.7 1L9.5 21h5l.34-2.5a7.6 7.6 0 001.7-1l2.4 1 2-3.5-2-1.5c.05-.33.07-.66.07-1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
            </svg>
          </Link>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.avatar}>{(displayName[0] ?? "U").toUpperCase()}</div>
        <div className={styles.heroMeta}>
          <h2 className={styles.name}>{displayName}</h2>
          <div className={styles.statsInline}>
            <span><b>{totalWorkouts}</b> Workouts</span>
          </div>
        </div>
        {/* History button */}
        <button
          type="button"
          className={styles.historyBtn}
          onClick={() => {
            if (user?.email) setReports(getReports(user.email));
            setHistoryOpen(true);
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 8v4l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M3.05 12A9 9 0 1012 21v0M3 3v6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          History
        </button>
      </section>

      <section className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <p className={styles.chartLabel}>{chartLabel}</p>
          <p className={styles.chartRange}>Last 4 weeks</p>
        </div>
        <div className={styles.bars}>
          {chartValues.map((val, i) => (
            <span
              key={i}
              className={styles.bar}
              style={{ height: `${Math.max((val / maxVal) * 112, val > 0 ? 8 : 0)}px` }}
            />
          ))}
        </div>
        <div className={styles.segmented}>
          {(["Duration", "Volume", "Reps"] as Segment[]).map((seg) => (
            <button
              key={seg}
              type="button"
              className={[styles.segBtn, activeSegment === seg ? styles.segActive : ""].join(" ")}
              onClick={() => handleSegment(seg)}
            >
              {seg}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.dashboard}>
        <div className={styles.grid}>
          {TILES.map(({ label, href, icon }) => (
            <Link key={label} href={href} className={styles.tile}>
              <span className={styles.tileIcon}>{icon}</span>
              {label}
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionLabel}>Account</div>
        <div className={styles.card}>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Name</span>
            <span className={styles.rowValue}>{displayName}</span>
          </div>
          <div className={styles.separator} />
          <div className={styles.row}>
            <span className={styles.rowLabel}>Username</span>
            <span className={styles.rowValue}>{displayUsername ? `@${displayUsername}` : "—"}</span>
          </div>
          <div className={styles.separator} />
          <div className={styles.row}>
            <span className={styles.rowLabel}>Email</span>
            <span className={styles.rowValue}>{displayEmail}</span>
          </div>
          <div className={styles.separator} />
          <div className={styles.row}>
            <span className={styles.rowLabel}>Member Since</span>
            <span className={styles.rowValue}>{joinDate}</span>
          </div>
        </div>
      </section>

      {loading && <div className={styles.loadingCenter}><Spinner size={24} /></div>}

      <div className={styles.logoutSection}>
        <Button variant="danger" fullWidth onClick={handleLogout} loading={loggingOut}>
          Log Out
        </Button>
      </div>
    </div>
  );
}
