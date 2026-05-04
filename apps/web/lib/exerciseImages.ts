const IMAGE_BASE =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises";

export function exerciseImageUrl(
  exerciseId: string,
  frame: 0 | 1 = 0
): string {
  return `${IMAGE_BASE}/${exerciseId}/${frame}.jpg`;
}

/** Convert an exercise name to its probable free-exercise-db ID format. */
export function nameToExerciseId(name: string): string {
  return name.replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, "_");
}
