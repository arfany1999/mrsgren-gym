// ── Fitness profile stored in localStorage (keyed by email) ──────────────────

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
  dayNumber: number;    // e.g. 87 → "Day 87"
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

