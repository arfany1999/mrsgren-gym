// Client wrapper around /api/coach.
//
// Strategy:
//   1. Read from localStorage cache (24h) keyed by exerciseId + lastWorkoutId
//      so the same exercise in the same session never costs more than one
//      Anthropic API call, and the cache invalidates the moment the user
//      completes a new session for that exercise.
//   2. POST to /api/coach. If the server returns 503 (no API key), null
//      (no history), or any error, the caller falls back to the existing
//      heuristic — the AI is an enhancement, not a dependency.
//   3. Write the result to the cache.
//
// The route handler shields the API key — this client only ever talks to
// our own /api/coach endpoint.

export type CoachStrategy = "increase" | "maintain" | "deload" | "first_session";

export interface CoachSuggestion {
  strategy: CoachStrategy;
  reps: number;
  weightKg: number;
  reasoning: string;
}

interface CoachHistorySession {
  date: string;
  sets: Array<{ reps: number | null; weightKg: number | null }>;
}

interface CoachRequestPayload {
  exercise: { name: string; muscleGroups?: string[] };
  history: CoachHistorySession[];
}

const CACHE_PREFIX = "gym_coach_v1:";
const TTL_MS = 24 * 60 * 60 * 1000; // 24h

interface CachedEntry {
  suggestion: CoachSuggestion;
  cachedAt: number;
}

function cacheKey(exerciseId: string, lastWorkoutId: string | null): string {
  return `${CACHE_PREFIX}${exerciseId}:${lastWorkoutId ?? "none"}`;
}

function readCache(key: string): CoachSuggestion | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CachedEntry;
    if (!entry?.cachedAt || Date.now() - entry.cachedAt > TTL_MS) {
      window.localStorage.removeItem(key);
      return null;
    }
    return entry.suggestion;
  } catch {
    return null;
  }
}

function writeCache(key: string, suggestion: CoachSuggestion) {
  if (typeof window === "undefined") return;
  try {
    const entry: CachedEntry = { suggestion, cachedAt: Date.now() };
    window.localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    /* quota / disabled — fine */
  }
}

export interface FetchCoachArgs {
  exerciseId: string;
  exerciseName: string;
  muscleGroups?: string[];
  /**
   * ID of the user's most recent completed workout for this exercise.
   * Used to invalidate the cache the moment they log a new session.
   * Pass null if there's no history yet.
   */
  lastWorkoutId: string | null;
  history: CoachHistorySession[];
}

export type FetchCoachResult =
  | { status: "ok"; suggestion: CoachSuggestion; cached: boolean }
  | { status: "ai_disabled" }
  | { status: "error"; reason: string };

export async function fetchCoachSuggestion(args: FetchCoachArgs): Promise<FetchCoachResult> {
  const key = cacheKey(args.exerciseId, args.lastWorkoutId);

  const cached = readCache(key);
  if (cached) {
    return { status: "ok", suggestion: cached, cached: true };
  }

  const payload: CoachRequestPayload = {
    exercise: { name: args.exerciseName, muscleGroups: args.muscleGroups },
    history: args.history,
  };

  let response: Response;
  try {
    response = await fetch("/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    return { status: "error", reason: "network" };
  }

  if (response.status === 503) {
    return { status: "ai_disabled" };
  }
  if (!response.ok) {
    return { status: "error", reason: `http_${response.status}` };
  }

  let data: { suggestion?: CoachSuggestion };
  try {
    data = (await response.json()) as { suggestion?: CoachSuggestion };
  } catch {
    return { status: "error", reason: "bad_json" };
  }
  if (!data?.suggestion) {
    return { status: "error", reason: "no_suggestion" };
  }

  writeCache(key, data.suggestion);
  return { status: "ok", suggestion: data.suggestion, cached: false };
}
