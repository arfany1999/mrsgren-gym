"use client";

import { useMemo, useState } from "react";
import styles from "./HistoryCalendar.module.css";

interface HistoryCalendarProps {
  /** ISO timestamps of completed workouts. */
  workoutDates: string[];
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DOW = ["S", "M", "T", "W", "T", "F", "S"] as const;

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function HistoryCalendar({ workoutDates }: HistoryCalendarProps) {
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const [viewDate, setViewDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const workoutDayKeys = useMemo(() => {
    const set = new Set<string>();
    for (const iso of workoutDates) {
      const d = new Date(iso);
      set.add(dayKey(d));
    }
    return set;
  }, [workoutDates]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDayDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: Array<{ day: number; isToday: boolean; hasWorkout: boolean } | null> = [];
  for (let i = 0; i < firstDayDow; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    const cellDate = new Date(year, month, day);
    cells.push({
      day,
      isToday: cellDate.getTime() === today.getTime(),
      hasWorkout: workoutDayKeys.has(dayKey(cellDate)),
    });
  }

  function prevMonth() { setViewDate(new Date(year, month - 1, 1)); }
  function nextMonth() { setViewDate(new Date(year, month + 1, 1)); }

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <button type="button" className={styles.navBtn} onClick={prevMonth} aria-label="Previous month">‹</button>
        <span className={styles.title}>{MONTHS[month]} {year}</span>
        <button type="button" className={styles.navBtn} onClick={nextMonth} aria-label="Next month">›</button>
      </div>

      <div className={styles.grid}>
        {DOW.map((d, i) => (
          <p key={`dow-${i}`} className={styles.dow}>{d}</p>
        ))}
        {cells.map((c, i) => {
          if (!c) return <span key={`pad-${i}`} className={styles.pad} aria-hidden />;
          return (
            <div key={`cell-${i}`} className={styles.cell}>
              <span
                className={[
                  styles.dayNum,
                  c.isToday ? styles.today : "",
                  c.hasWorkout ? styles.workoutDay : "",
                ].filter(Boolean).join(" ")}
              >
                {c.day}
              </span>
              {c.hasWorkout && <span className={styles.dot} aria-hidden />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
