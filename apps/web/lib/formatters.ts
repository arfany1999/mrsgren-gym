// ── Duration ─────────────────────────────────────────────────
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function formatDurationHHMMSS(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

export function workoutDuration(startedAt: string, finishedAt: string | null): string {
  if (!finishedAt) return "—";
  const diff = Math.floor((new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 1000);
  return formatDuration(diff);
}

// ── Weight ────────────────────────────────────────────────────
export function formatWeight(kg: number | null, unit: "kg" | "lbs" = "kg"): string {
  if (kg === null || kg === undefined) return "—";
  if (unit === "lbs") return `${(kg * 2.20462).toFixed(1)} lbs`;
  return `${kg} kg`;
}

// ── Volume (total weight moved) ───────────────────────────────
export function calcVolume(sets: { reps: number | null; weightKg: number | null }[]): number {
  return sets.reduce((sum, s) => sum + (s.reps ?? 0) * (s.weightKg ?? 0), 0);
}

// ── Dates ─────────────────────────────────────────────────────
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${DAY_NAMES[d.getDay()]}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
}

export function formatDateFull(iso: string): string {
  const d = new Date(iso);
  return `${DAY_NAMES[d.getDay()]}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${h12}:${pad(m)} ${ampm}`;
}

export function formatRelativeDate(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

// ── 1-Rep Max (Epley formula) ─────────────────────────────────
export function calcOneRepMax(weightKg: number, reps: number): number {
  if (reps === 1) return weightKg;
  return Math.round(weightKg * (1 + reps / 30));
}

// ── Muscle Groups ─────────────────────────────────────────────
export function formatMuscleGroups(groups: string[]): string {
  return groups.map((g) => g.replace(/_/g, " ")).join(", ");
}

/**
 * Parses the `muscle_group` column from Supabase.
 * The column may be stored as:
 *   - a plain string: "chest"
 *   - a JSON array string: '["chest","triceps"]'  (from old inserts that passed an array)
 * Returns a clean string[] in all cases.
 */
export function parseMuscleGroup(raw: unknown): string[] {
  if (!raw) return [];
  const s = String(raw).trim();
  if (s.startsWith("[")) {
    try {
      const parsed = JSON.parse(s);
      return (Array.isArray(parsed) ? parsed : [parsed]).map(String).filter(Boolean);
    } catch {
      // fall through
    }
  }
  return s ? [s] : [];
}
