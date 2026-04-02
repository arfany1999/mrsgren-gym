const IS_BROWSER = typeof window !== "undefined";

const KEYS = {
  REFRESH_TOKEN: "gym_refresh_token",
  ACTIVE_WORKOUT_ID: "gym_active_workout_id",
  USER: "gym_user",
} as const;

export function getRefreshToken(): string | null {
  if (!IS_BROWSER) return null;
  return localStorage.getItem(KEYS.REFRESH_TOKEN);
}

export function setRefreshToken(token: string): void {
  if (!IS_BROWSER) return;
  localStorage.setItem(KEYS.REFRESH_TOKEN, token);
}

export function clearRefreshToken(): void {
  if (!IS_BROWSER) return;
  localStorage.removeItem(KEYS.REFRESH_TOKEN);
}

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

export function getStoredUser<T>(): T | null {
  if (!IS_BROWSER) return null;
  const raw = localStorage.getItem(KEYS.USER);
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

export function setStoredUser<T>(user: T): void {
  if (!IS_BROWSER) return;
  localStorage.setItem(KEYS.USER, JSON.stringify(user));
}

export function clearStoredUser(): void {
  if (!IS_BROWSER) return;
  localStorage.removeItem(KEYS.USER);
}
