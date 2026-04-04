"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button/Button";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import { formatDateFull } from "@/lib/formatters";
import styles from "./page.module.css";

type Segment = "Duration" | "Volume" | "Reps";

export default function ProfilePage() {
  const { profile, user, supabase, logout } = useAuth();
  const [totalWorkouts, setTotalWorkouts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [activeSegment, setActiveSegment] = useState<Segment>("Duration");
  const [chartValues, setChartValues] = useState<number[]>([0, 0, 0, 0]);
  const [chartLabel, setChartLabel] = useState("0 hours this week");

  const fetchChartData = useCallback(async (segment: Segment) => {
    const now = new Date();
    const from = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000).toISOString();

    if (segment === "Reps") {
      const { data } = await supabase
        .from("workouts")
        .select("started_at, workout_exercises(workout_sets(reps))")
        .not("finished_at", "is", null)
        .gte("started_at", from);

      const weeks = [0, 0, 0, 0];
      (data ?? []).forEach((w: Record<string, unknown>) => {
        const weeksAgo = Math.min(
          Math.floor((now.getTime() - new Date(w.started_at as string).getTime()) / (7 * 24 * 60 * 60 * 1000)),
          3
        );
        const wes = (w.workout_exercises as Record<string, unknown>[]) ?? [];
        wes.forEach((we) => {
          const sets = (we.workout_sets as Record<string, unknown>[]) ?? [];
          sets.forEach((s) => { weeks[weeksAgo] = (weeks[weeksAgo] ?? 0) + ((s.reps as number) ?? 0); });
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
        const weeksAgo = Math.min(
          Math.floor((now.getTime() - new Date(w.started_at as string).getTime()) / (7 * 24 * 60 * 60 * 1000)),
          3
        );
        if (segment === "Duration") {
          weeks[weeksAgo] = (weeks[weeksAgo] ?? 0) + (((w.duration_secs as number) ?? 0) / 3600);
        } else {
          weeks[weeksAgo] = (weeks[weeksAgo] ?? 0) + ((w.total_volume as number) ?? 0);
        }
      });
      const vals = [...weeks].reverse();
      setChartValues(vals);
      if (segment === "Duration") {
        setChartLabel(`${(vals[3] ?? 0).toFixed(1)} hours this week`);
      } else {
        setChartLabel(`${Math.round(vals[3] ?? 0).toLocaleString()} kg this week`);
      }
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
  }, [supabase, fetchChartData]);

  async function handleSegment(seg: Segment) {
    setActiveSegment(seg);
    await fetchChartData(seg);
  }

  async function handleLogout() {
    setLoggingOut(true);
    try { await logout(); } finally { setLoggingOut(false); }
  }

  const joinDate = user?.created_at ? formatDateFull(user.created_at) : "—";
  const displayName =
    profile?.name ||
    (user?.user_metadata?.name as string) ||
    (user?.user_metadata?.full_name as string) ||
    user?.email?.split("@")[0] ||
    "Athlete";
  const displayUsername =
    profile?.username ||
    (user?.user_metadata?.username as string) ||
    user?.email?.split("@")[0] ||
    null;
  const displayEmail = profile?.email || user?.email || "—";

  const maxVal = Math.max(...chartValues, 1);

  const TILES = [
    { label: "Statistics", href: "/statistics", icon: "📊" },
    { label: "Exercises",  href: "/exercises",  icon: "🏋️" },
    { label: "Measures",   href: "/measures",   icon: "📏" },
    { label: "Calendar",   href: "/workouts",   icon: "📅" },
  ];

  return (
    <div className={styles.page}>
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

      {loading && (
        <div className={styles.loadingCenter}><Spinner size={24} /></div>
      )}

      <div className={styles.logoutSection}>
        <Button variant="danger" fullWidth onClick={handleLogout} loading={loggingOut}>
          Log Out
        </Button>
      </div>
    </div>
  );
}
