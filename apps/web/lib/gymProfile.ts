// ── Fitness profile persistence ──────────────────────────────────────────────
// Supabase is the source of truth; localStorage remains a fast/offline fallback
// and keeps existing installs from losing their onboarding state.

import type { SupabaseClient } from "@supabase/supabase-js";

export type Sex = "male" | "female";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "very_active";
export type WeightUnit = "kg" | "lbs";
export type HeightUnit = "cm" | "ftin";

export interface GymProfile {
  sex: Sex;
  age: number;
  weight_kg: number;
  height_cm: number;
  activity_level: ActivityLevel;
  onboarding_done: true;
}

function key(email: string) {
  return `gym_profile_${email.toLowerCase()}`;
}

export function getProfile(email: string): GymProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key(email));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GymProfile>;
    if (!parsed.onboarding_done) return null;
    return parsed as GymProfile;
  } catch {
    return null;
  }
}

export function saveProfile(email: string, profile: GymProfile): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key(email), JSON.stringify(profile));
}

function normalizeRemoteProfile(row: Record<string, unknown> | null): GymProfile | null {
  if (!row?.onboarding_done) return null;
  const sex = row.sex === "female" ? "female" : "male";
  const activity = typeof row.activity_level === "string"
    ? row.activity_level as ActivityLevel
    : "moderate";
  const age = Number(row.age);
  const weightKg = Number(row.weight_kg);
  const heightCm = Number(row.height_cm);
  if (!age || !weightKg || !heightCm) return null;
  return {
    sex,
    age,
    weight_kg: Math.round(weightKg * 10) / 10,
    height_cm: Math.round(heightCm),
    activity_level: activity,
    onboarding_done: true,
  };
}

export async function loadProfile(
  supabase: SupabaseClient,
  userId: string,
  email: string,
): Promise<GymProfile | null> {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("sex, age, weight_kg, height_cm, activity_level, onboarding_done")
      .eq("id", userId)
      .maybeSingle();
    if (!error) {
      const remote = normalizeRemoteProfile(data as Record<string, unknown> | null);
      if (remote) {
        saveProfile(email, remote);
        return remote;
      }
    }
  } catch {
    // Older deployments may not have the body-profile columns yet.
  }
  return getProfile(email);
}

export async function saveProfileRecord(
  supabase: SupabaseClient,
  user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> },
  profile: GymProfile,
): Promise<void> {
  if (!user.email) return;
  saveProfile(user.email, profile);
  try {
    const fallbackName =
      (user.user_metadata?.name as string | undefined) ??
      user.email.split("@")[0] ??
      "Athlete";
    const fallbackUsername =
      (user.user_metadata?.username as string | undefined) ??
      user.email.split("@")[0] ??
      null;
    await supabase
      .from("users")
      .upsert({
        id: user.id,
        email: user.email,
        name: fallbackName,
        username: fallbackUsername,
        sex: profile.sex,
        age: profile.age,
        weight_kg: profile.weight_kg,
        height_cm: profile.height_cm,
        activity_level: profile.activity_level,
        onboarding_done: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });
  } catch {
    // Local save above keeps the app usable if the remote migration is pending.
  }
}

/** TDEE multiplier per activity level */
export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary:   1.2,
  light:       1.375,
  moderate:    1.55,
  very_active: 1.725,
};

/** MET values for cardio exercises */
export const CARDIO_MET: Record<string, number> = {
  "Treadmill":             8.0,
  "Incline Treadmill Walk": 5.5,
  "Stationary Bike":       6.0,
  "Rowing Machine":        7.0,
  "Elliptical":            5.5,
  "Stair Climber":         8.5,
  "Ski Erg":               9.5,
};

/** MET for weight training */
export const WEIGHT_TRAINING_MET = 4.0;

/**
 * Estimate calories burned during a workout block.
 * @param weightKg  user body weight in kg
 * @param durationMins  exercise duration in minutes
 * @param exerciseName  used to look up a cardio MET if applicable
 * @param isCardio  whether this is a cardio exercise
 */
export function estimateCalories(
  weightKg: number,
  durationMins: number,
  exerciseName: string,
  isCardio: boolean
): number {
  const durationHours = durationMins / 60;
  const met = isCardio
    ? (CARDIO_MET[exerciseName] ?? 7.0)
    : WEIGHT_TRAINING_MET;
  return Math.round(met * weightKg * durationHours);
}

// ── Workout report history (per-email in localStorage) ───────────────────────

export interface WorkoutReportExercise {
  name: string;
  sets: number;
  calories: number;
  setSummary: string;
}

export interface WorkoutReportEntry {
  id: string;           // workoutId
  date: string;         // ISO date string
  title: string;
  durationMins: number;
  totalCalories: number;
  dayNumber: number;    // Nth completed session overall (e.g. 87 → "Workout #87")
  trainingDay?: number; // Nth UNIQUE calendar day trained (drives medal progression). Optional for back-compat with older reports.
  totalSets: number;
  totalVolume: number;  // kg
  exercises: WorkoutReportExercise[];
}

function reportKey(email: string) {
  return `gym_reports_${email.toLowerCase()}`;
}

export function getReports(email: string): WorkoutReportEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(reportKey(email));
    return raw ? (JSON.parse(raw) as WorkoutReportEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveReport(email: string, report: WorkoutReportEntry): void {
  if (typeof window === "undefined") return;
  const existing = getReports(email);
  const deduped = [report, ...existing.filter(r => r.id !== report.id)];
  localStorage.setItem(reportKey(email), JSON.stringify(deduped.slice(0, 200)));
}

export function clearReports(email: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(reportKey(email));
}
