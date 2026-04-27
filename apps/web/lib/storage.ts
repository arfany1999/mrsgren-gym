const IS_BROWSER = typeof window !== "undefined";

const KEYS = {
  ACTIVE_WORKOUT_ID: "gym_active_workout_id",
  REST_TIMER:        "gym_rest_timer_v1",
} as const;

export function getActiveWorkoutId(): string | null {
  if (!IS_BROWSER) return null;
  return localStorage.getItem(KEYS.ACTIVE_WORKOUT_ID);
}

export function setActiveWorkoutId(id: string): void {
  if (!IS_BROWSER) return;
  localStorage.setItem(KEYS.ACTIVE_WORKOUT_ID, id);
}

export function clearActiveWorkoutId(): void {
  if (!IS_BROWSER) return;
  localStorage.removeItem(KEYS.ACTIVE_WORKOUT_ID);
}

// ── Rest-timer persistence ────────────────────────────────────
// Stored as an absolute end-timestamp so the countdown is accurate even after
// a phone lock, app swipe, or full reload. The active-workout page rehydrates
// from this on mount and keeps it in sync as the user adjusts/skips.
export type RestTimerState = {
  endsAt: number;            // ms since epoch
  totalSecs: number;         // original duration so the progress ring scales
  exerciseName?: string;
  alerted?: boolean;         // we've already played the "rest done" cue
};

export function getRestTimer(): RestTimerState | null {
  if (!IS_BROWSER) return null;
  try {
    const raw = localStorage.getItem(KEYS.REST_TIMER);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RestTimerState;
    if (typeof parsed?.endsAt !== "number" || typeof parsed?.totalSecs !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setRestTimer(state: RestTimerState | null): void {
  if (!IS_BROWSER) return;
  try {
    if (state == null) localStorage.removeItem(KEYS.REST_TIMER);
    else localStorage.setItem(KEYS.REST_TIMER, JSON.stringify(state));
  } catch {
    /* storage disabled — runtime state still works */
  }
}
