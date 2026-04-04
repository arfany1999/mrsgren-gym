// ── Free Exercise DB (yuhonas/free-exercise-db) ───────────────────
// 800+ public-domain exercises, images served from GitHub raw CDN.
// No API key, no paywall.

export const IMAGE_BASE =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises";

const JSON_URL =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";

// ── Types ─────────────────────────────────────────────────────────
export interface FreeExercise {
  id: string;               // e.g. "Barbell_Bench_Press_-_Medium_Grip"
  name: string;             // e.g. "Barbell Bench Press - Medium Grip"
  category: string;         // "strength" | "cardio" | "stretching" ...
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string;
  instructions: string[];
  images: string[];         // relative paths → use imageUrl()
}

// ── Module-level cache ────────────────────────────────────────────
let cache: FreeExercise[] | null = null;
let loadPromise: Promise<FreeExercise[]> | null = null;

export async function loadExercises(): Promise<FreeExercise[]> {
  if (cache) return cache;
  if (loadPromise) return loadPromise;
  loadPromise = fetch(JSON_URL)
    .then((r) => r.json())
    .then((data: FreeExercise[]) => {
      cache = data;
      return data;
    })
    .catch(() => {
      cache = [];
      return [] as FreeExercise[];
    });
  return loadPromise;
}

// ── Image URL helper ──────────────────────────────────────────────
export function imageUrl(exercise: FreeExercise, frame: 0 | 1): string {
  const path = exercise.images[frame] ?? exercise.images[0];
  return `${IMAGE_BASE}/${path}`;
}

export function imageUrlById(id: string, frame: 0 | 1): string {
  return `${IMAGE_BASE}/${id}/${frame}.jpg`;
}

// ── Browse (paginated) ────────────────────────────────────────────
export async function browseExercises(opts: {
  limit?: number;
  offset?: number;
  muscle?: string;
}): Promise<{ exercises: FreeExercise[]; total: number }> {
  const all = await loadExercises();
  const { limit = 50, offset = 0, muscle = "" } = opts;

  const filtered = muscle
    ? all.filter((e) =>
        [...(e.primaryMuscles ?? []), ...(e.secondaryMuscles ?? [])].some((m) =>
          m.toLowerCase().includes(muscle.toLowerCase())
        )
      )
    : all;

  return {
    exercises: filtered.slice(offset, offset + limit),
    total: filtered.length,
  };
}

// ── Search ────────────────────────────────────────────────────────
export async function searchFreeExercises(query: string): Promise<FreeExercise[]> {
  const all = await loadExercises();
  const q = query.toLowerCase();
  return all.filter(
    (e) =>
      e.name.toLowerCase().includes(q) ||
      e.primaryMuscles.some((m) => m.toLowerCase().includes(q)) ||
      (e.equipment ?? "").toLowerCase().includes(q)
  );
}

// ── Find by ID ────────────────────────────────────────────────────
export async function findById(id: string): Promise<FreeExercise | null> {
  const all = await loadExercises();
  return all.find((e) => e.id === id) ?? null;
}

// ── Fuzzy name match (for ExerciseAnimation) ──────────────────────
function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export async function findExerciseId(name: string): Promise<string | null> {
  const exercises = await loadExercises();
  if (!exercises.length) return null;

  const needle = normalize(name);
  let bestId: string | null = null;
  let bestScore = 0;

  for (const ex of exercises) {
    const hay = normalize(ex.name);
    if (hay === needle) return ex.id;

    let score = 0;
    if (hay.startsWith(needle)) score = needle.length * 2;
    else if (hay.includes(needle)) score = needle.length;
    else if (needle.startsWith(hay)) score = hay.length;
    else {
      let i = 0;
      while (i < needle.length && i < hay.length && needle[i] === hay[i]) i++;
      score = i * 0.5;
    }

    if (score > bestScore) {
      bestScore = score;
      bestId = ex.id;
    }
  }

  return bestScore >= needle.length * 0.6 ? bestId : null;
}
