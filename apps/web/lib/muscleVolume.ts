// Client wrapper around the public.get_muscle_volume(lookback_days) RPC.
// Returns { muscle: volume } map (kg × reps) for the authenticated user.

import type { SupabaseClient } from "@supabase/supabase-js";

export interface MuscleVolumeRow {
  muscle: string;
  volume: number;
  setCount: number;
}

interface RpcRow {
  muscle: string;
  volume: number | string;
  set_count: number;
}

export async function fetchMuscleVolume(
  supabase: SupabaseClient,
  lookbackDays = 30,
): Promise<MuscleVolumeRow[]> {
  const { data, error } = await supabase.rpc("get_muscle_volume", {
    lookback_days: lookbackDays,
  });
  if (error || !data) return [];
  return (data as RpcRow[]).map((r) => ({
    muscle: r.muscle,
    volume: Number(r.volume) || 0,
    setCount: r.set_count ?? 0,
  }));
}

/** Convenience: collapse rows into a { muscle: volume } map. */
export function muscleVolumeMap(rows: MuscleVolumeRow[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) out[r.muscle] = (out[r.muscle] ?? 0) + r.volume;
  return out;
}
