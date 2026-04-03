import type { Exercise } from "@/types/api";

const BASE_URL = "https://exercisedb.dev/api/v1";

interface ExerciseDBItem {
  exerciseId: string;
  name: string;
  gifUrl: string;
  targetMuscles: string[];
  bodyParts: string[];
  equipments: string[];
  secondaryMuscles: string[];
  instructions: string[];
}

interface ExerciseDBListResponse {
  success: boolean;
  metadata: {
    totalExercises: number;
    totalPages: number;
    currentPage: number;
    nextPage: string | null;
    previousPage: string | null;
  };
  data: ExerciseDBItem[];
}

function toExercise(item: ExerciseDBItem): Exercise {
  return {
    id: item.exerciseId,
    name: item.name,
    videoUrl: item.gifUrl,
    muscleGroups: [
      ...item.targetMuscles,
      ...item.secondaryMuscles,
    ],
    equipment: item.equipments[0] ?? null,
    instructions: item.instructions
      .map((s) => s.replace(/^Step:\d+\s*/, ""))
      .join("\n"),
    isCustom: false,
    createdByUserId: null,
  };
}

export async function fetchExercises(opts: {
  limit?: number;
  offset?: number;
}): Promise<{ exercises: Exercise[]; total: number }> {
  const params = new URLSearchParams({
    limit: String(opts.limit ?? 50),
    offset: String(opts.offset ?? 0),
    sortBy: "name",
    sortOrder: "asc",
  });

  const res = await fetch(`${BASE_URL}/exercises?${params}`);
  if (!res.ok) throw new Error("Failed to fetch exercises");

  const json: ExerciseDBListResponse = await res.json();
  return {
    exercises: json.data.map(toExercise),
    total: json.metadata.totalExercises,
  };
}

export async function fetchExerciseById(id: string): Promise<Exercise | null> {
  try {
    const res = await fetch(`${BASE_URL}/exercises/${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    const json = await res.json();
    // API returns single object with a data field or directly
    const item: ExerciseDBItem = json.data ?? json;
    if (!item?.exerciseId) return null;
    return toExercise(item);
  } catch {
    return null;
  }
}

export async function searchExercises(opts: {
  q: string;
  limit?: number;
}): Promise<{ exercises: Exercise[]; total: number }> {
  const params = new URLSearchParams({
    q: opts.q,
    limit: String(opts.limit ?? 50),
  });

  const res = await fetch(`${BASE_URL}/exercises/search?${params}`);
  if (!res.ok) throw new Error("Failed to search exercises");

  const json: ExerciseDBListResponse = await res.json();
  return {
    exercises: json.data.map(toExercise),
    total: json.metadata.totalExercises,
  };
}
