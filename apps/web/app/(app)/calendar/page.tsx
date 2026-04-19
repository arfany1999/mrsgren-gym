"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { TopBar } from "@/components/layout/TopBar/TopBar";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import styles from "./page.module.css";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const WEEKDAYS_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const WEEKDAYS_LABEL = ["","Mon","","Wed","","Fri",""];

interface WorkoutEntry {
  id: string;
  dateKey: string; // "YYYY-MM-DD"
  title: string;
  durationMins: number;
  totalVolume: number;
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildGrid(): Date[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOffset = today.getDay();
  const start = new Date(today);
  start.setDate(start.getDate() - 52 * 7 - startOffset);
  const days: Date[] = [];
  const cur = new Date(start);
  while (cur <= today) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso + "T00:00:00").getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function formatDuration(mins: number): string {
  if (mins < 1) return "< 1 min";
  if (mins < 60) return `${Math.round(mins)} min`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function CalendarPage() {
  const { supabase } = useAuth();
  const [workouts, setWorkouts] = useState<WorkoutEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const workoutRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    async function load() {
      try {
        const yearAgo = new Date();
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        const { data } = await supabase
          .from("workouts")
          .select("id, started_at, title, duration_secs, total_volume")
          .not("finished_at", "is", null)
          .gte("started_at", yearAgo.toISOString())
          .order("started_at", { ascending: false });

        setWorkouts(
          (data ?? []).map((w: Record<string, unknown>) => ({
            id: w.id as string,
            dateKey: toDateKey(new Date(w.started_at as string)),
            title: (w.title as string) || "Workout",
            durationMins: Math.round(((w.duration_secs as number) ?? 0) / 60),
            totalVolume: (w.total_volume as number) ?? 0,
          }))
        );
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [supabase]);

  const workoutMap = new Map<string, WorkoutEntry>();
  for (const w of workouts) {
    if (!workoutMap.has(w.dateKey)) workoutMap.set(w.dateKey, w);
  }
  const workoutDays = new Set(workoutMap.keys());

  // Streak
  let streak = 0;
  const d = new Date(); d.setHours(0, 0, 0, 0);
  while (workoutDays.has(toDateKey(d))) { streak++; d.setDate(d.getDate() - 1); }

  const today = toDateKey(new Date());

  // Current week strip (Sun – Sat of this week)
  const weekStart = new Date(); weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const currentWeek = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(weekStart); day.setDate(weekStart.getDate() + i);
    return { date: day, key: toDateKey(day) };
  });

  // Heatmap grid
  const grid = buildGrid();
  const weeks: Date[][] = [];
  for (let i = 0; i < grid.length; i += 7) weeks.push(grid.slice(i, i + 7));

  const monthLabels: { label: string; col: number }[] = [];
  weeks.forEach((week, col) => {
    const first = week[0];
    const name = first ? MONTHS[first.getMonth()] : undefined;
    if (first && name && first.getDate() <= 7) monthLabels.push({ label: name, col });
  });

  function handleCellClick(key: string) {
    if (!workoutDays.has(key)) return;
    setSelectedDate(key);
    setTimeout(() => {
      const el = workoutRefs.current.get(key);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      else feedRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  return (
    <div className={styles.page}>
      <TopBar title="Workout Calendar" showBack />

      {loading ? (
        <div className={styles.center}><Spinner size={28} /></div>
      ) : (
        <>
          {/* ── Stat cards ── */}
          <div className={styles.stats}>
            <div className={styles.statCard}>
              <p className={styles.statValue}>{workoutDays.size}</p>
              <p className={styles.statLabel}>Days This Year</p>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statValue}>{streak}</p>
              <p className={styles.statLabel}>Day Streak</p>
            </div>
          </div>

          {/* ── Current week strip ── */}
          <div className={styles.weekStrip}>
            {currentWeek.map(({ date, key }) => {
              const isToday = key === today;
              const done = workoutDays.has(key);
              const future = date > new Date();
              return (
                <div key={key} className={styles.weekDayCol}>
                  <span className={styles.weekDayLabel}>{WEEKDAYS_SHORT[date.getDay()]}</span>
                  <div
                    className={[
                      styles.weekCircle,
                      done ? styles.weekCircleDone : "",
                      isToday ? styles.weekCircleToday : "",
                      future ? styles.weekCircleFuture : "",
                    ].filter(Boolean).join(" ")}
                    onClick={() => done && handleCellClick(key)}
                  >
                    {done && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <path d="M5 12l5 5L19 7" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Heatmap ── */}
          <div className={styles.heatmapWrap}>
            <div className={styles.monthRow}>
              <div className={styles.dayLabelSpacer} />
              <div className={styles.monthLabels}>
                {monthLabels.map(({ label, col }) => (
                  <span key={`${label}-${col}`} className={styles.monthLabel} style={{ gridColumnStart: col + 1 }}>
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <div className={styles.gridRow}>
              <div className={styles.dayLabels}>
                {WEEKDAYS_LABEL.map((l, i) => (
                  <span key={i} className={styles.dayLabel}>{l}</span>
                ))}
              </div>
              <div className={styles.grid}>
                {weeks.map((week, wi) => (
                  <div key={wi} className={styles.week}>
                    {week.map((day, di) => {
                      const key = toDateKey(day);
                      const hasWorkout = workoutDays.has(key);
                      const isToday = key === today;
                      const isSelected = key === selectedDate;
                      return (
                        <div
                          key={di}
                          className={[
                            styles.cell,
                            hasWorkout ? styles.active : styles.empty,
                            isToday ? styles.cellToday : "",
                            isSelected ? styles.cellSelected : "",
                            hasWorkout ? styles.clickable : "",
                          ].filter(Boolean).join(" ")}
                          onClick={() => handleCellClick(key)}
                          title={`${key}${hasWorkout ? " · Tap to view" : ""}`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.legend}>
              <span className={styles.legendLabel}>Less</span>
              <div className={`${styles.cell} ${styles.empty}`} />
              <div className={`${styles.cell} ${styles.active}`} />
              <span className={styles.legendLabel}>More</span>
            </div>
          </div>

          {/* ── Recent workouts feed ── */}
          <div className={styles.feedSection} ref={feedRef}>
            <h2 className={styles.feedTitle}>Recent Workouts</h2>
            {workouts.length === 0 ? (
              <p className={styles.feedEmpty}>No workouts yet. Start training to see your history here.</p>
            ) : (
              <div className={styles.feedList}>
                {workouts.map((w) => {
                  const isSelected = w.dateKey === selectedDate;
                  return (
                    <div
                      key={w.id}
                      ref={(el) => { if (el) workoutRefs.current.set(w.dateKey, el); }}
                      className={[styles.feedCard, isSelected ? styles.feedCardSelected : ""].filter(Boolean).join(" ")}
                    >
                      <div className={styles.feedCardLeft}>
                        <p className={styles.feedDate}>{relativeDate(w.dateKey)}</p>
                        <p className={styles.feedTitle2}>{w.title}</p>
                      </div>
                      <div className={styles.feedCardRight}>
                        {w.durationMins > 0 && (
                          <span className={styles.feedChip}>{formatDuration(w.durationMins)}</span>
                        )}
                        {w.totalVolume > 0 && (
                          <span className={styles.feedChip}>{Math.round(w.totalVolume).toLocaleString()} kg</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
