const IS_BROWSER = typeof window !== "undefined";

const KEYS = {
  ACTIVE_WORKOUT_ID: "gym_active_workout_id",
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
