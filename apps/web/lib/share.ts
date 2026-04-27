// Share-token client helpers. Talks to the share_tokens table (owner only)
// and the get_share_summary(token) RPC (anon-readable for valid tokens).

import type { SupabaseClient } from "@supabase/supabase-js";

export interface ShareSummary {
  displayName: string;
  workoutTitle: string;
  startedAt: string;
  durationSecs: number;
  totalVolume: number;
  exerciseCount: number;
  workoutDays: number;
  currentStreak: number;
}

interface ShareSummaryRow {
  display_name: string;
  workout_title: string;
  started_at: string;
  duration_secs: number;
  total_volume: number | string;
  exercise_count: number;
  workout_days: number;
  current_streak: number;
}

/** URL-safe random token (~22 chars). */
function newToken(): string {
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const buf = new Uint8Array(16);
    crypto.getRandomValues(buf);
    return Array.from(buf, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 22);
  }
  return Math.random().toString(36).slice(2, 24);
}

/** Mint a share token for a workout owned by the calling user. */
export async function createShareToken(
  supabase: SupabaseClient,
  workoutId: string,
  userId: string,
  ttlDays = 365,
): Promise<string | null> {
  const token = newToken();
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase.from("share_tokens").insert({
    token,
    user_id: userId,
    workout_id: workoutId,
    expires_at: expiresAt,
  });
  if (error) return null;
  return token;
}

/** Resolve a public share token via the SECURITY DEFINER RPC. */
export async function fetchShareSummary(
  supabase: SupabaseClient,
  token: string,
): Promise<ShareSummary | null> {
  const { data, error } = await supabase.rpc("get_share_summary", { p_token: token });
  if (error || !data) return null;
  const row = (Array.isArray(data) ? data[0] : data) as ShareSummaryRow | undefined;
  if (!row) return null;
  return {
    displayName: row.display_name ?? "Athlete",
    workoutTitle: row.workout_title ?? "Workout",
    startedAt: row.started_at,
    durationSecs: row.duration_secs ?? 0,
    totalVolume: Number(row.total_volume) || 0,
    exerciseCount: row.exercise_count ?? 0,
    workoutDays: row.workout_days ?? 0,
    currentStreak: row.current_streak ?? 0,
  };
}

/** Revoke a share token (soft-delete, keeps audit trail). */
export async function revokeShareToken(
  supabase: SupabaseClient,
  token: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("share_tokens")
    .update({ revoked: true })
    .eq("token", token);
  return !error;
}
