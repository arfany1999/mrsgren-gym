// Client wrapper around the public.get_user_streak_stats() Supabase RPC.
// Falls back to client-side aggregation so the redesign branch keeps working
// before the migration is applied to production.

import type { SupabaseClient } from "@supabase/supabase-js";

export interface StreakStats {
  workoutDays: number;
  currentStreak: number;
  longestStreak: number;
}

interface RpcRow {
  workout_days: number;
  current_streak: number;
  longest_streak: number;
}

export async function fetchStreakStats(
  supabase: SupabaseClient,
): Promise<StreakStats | null> {
  const { data, error } = await supabase.rpc("get_user_streak_stats");
  if (error || !data) return null;
  const row = (Array.isArray(data) ? data[0] : data) as RpcRow | undefined;
  if (!row) return null;
  return {
    workoutDays: row.workout_days ?? 0,
    currentStreak: row.current_streak ?? 0,
    longestStreak: row.longest_streak ?? 0,
  };
}

/** Local fallback — keeps parity with computeDayStats() in profile/page.tsx. */
export function computeStreakStatsLocal(startedAtIsoList: string[]): StreakStats {
  if (startedAtIsoList.length === 0) {
    return { workoutDays: 0, currentStreak: 0, longestStreak: 0 };
  }

  const dayKeys = new Set<string>();
  for (const iso of startedAtIsoList) {
    const d = new Date(iso);
    dayKeys.add(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    );
  }
  const sorted = Array.from(dayKeys).sort();
  const days = sorted.length;

  const msPerDay = 24 * 60 * 60 * 1000;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today.getTime() - msPerDay);
  const keyFor = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  let currentStreak = 0;
  if (dayKeys.has(keyFor(today)) || dayKeys.has(keyFor(yesterday))) {
    let cursor = dayKeys.has(keyFor(today)) ? today : yesterday;
    while (dayKeys.has(keyFor(cursor))) {
      currentStreak += 1;
      cursor = new Date(cursor.getTime() - msPerDay);
    }
  }

  let longestStreak = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const k of sorted) {
    const d = new Date(k);
    if (prev && d.getTime() - prev.getTime() === msPerDay) run += 1;
    else run = 1;
    if (run > longestStreak) longestStreak = run;
    prev = d;
  }

  return { workoutDays: days, currentStreak, longestStreak };
}

/**
 * Compute streak stats from the caller-supplied date list.
 *
 * Originally this preferred the `get_user_streak_stats` RPC and fell back
 * to local. In practice the RPC has been returning a smaller current-
 * streak number than the calendar's straight day-walk does (1 vs 4 for
 * the same data), and the visible inconsistency between dashboard and
 * calendar is a worse UX problem than the trivial CPU cost of doing the
 * walk on the client. Two surfaces, one source of truth.
 *
 * The `supabase` parameter is kept for signature stability across
 * callers (and for the eventual fix-the-RPC path), but is unused.
 */
export async function getStreakStats(
  _supabase: SupabaseClient,
  fallbackDates: () => Promise<string[]>,
): Promise<StreakStats> {
  const dates = await fallbackDates();
  return computeStreakStatsLocal(dates);
}
