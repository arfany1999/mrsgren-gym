"use client";

import { use, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { fetchShareSummary, type ShareSummary } from "@/lib/share";
import { ShareCard, type ShareCardData } from "@/components/share/ShareCard/ShareCard";
import styles from "./page.module.css";

const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

function buildCardData(summary: ShareSummary): ShareCardData {
  const d = new Date(summary.startedAt);
  const day = DAYS[d.getUTCDay()] ?? "";
  const date = `${MONTHS[d.getUTCMonth()] ?? ""} ${d.getUTCDate()}`;
  // Calorie estimate: ~5 kcal / minute is a coarse but defensible figure for
  // mixed strength sessions. Refined when the workout schema tracks heart-rate.
  const calories = Math.round((summary.durationSecs / 60) * 5);
  return {
    name: (summary.displayName.split(" ")[0] ?? summary.displayName).slice(0, 18),
    day,
    date,
    duration: formatDuration(summary.durationSecs),
    volume: Math.round(summary.totalVolume),
    exercises: summary.exerciseCount,
    cardio: 0,
    calories,
    workoutDays: summary.workoutDays,
    streakDays: summary.currentStreak,
  };
}

export default function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [summary, setSummary] = useState<ShareSummary | null | undefined>(undefined);

  useEffect(() => {
    const supabase = createClient();
    fetchShareSummary(supabase, token).then((s) => setSummary(s));
  }, [token]);

  if (summary === undefined) {
    return (
      <div className={styles.shell}>
        <div className={styles.skeleton} />
      </div>
    );
  }

  if (summary === null) {
    return (
      <div className={styles.shell}>
        <div className={styles.notFound}>
          <h1>Link expired</h1>
          <p>This share link is no longer valid. Ask the athlete for a fresh one.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <div className={styles.cardWrap}>
        <ShareCard data={buildCardData(summary)} />
      </div>
    </div>
  );
}
