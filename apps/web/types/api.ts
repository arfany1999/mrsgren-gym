// ── Set Types ────────────────────────────────────────────────
export type SetType = "normal" | "warmup" | "dropset" | "failure";

// ── Core Models ──────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Exercise {
  id: string;
  name: string;
  muscleGroups: string[];
  equipment: string | null;
  instructions: string | null;
  videoUrl: string | null;
  isCustom: boolean;
  createdByUserId: string | null;
  measurementType?: string;
}

export interface Set {
  id: string;
  workoutExerciseId: string;
  reps: number | null;
  weightKg: number | null;
  setType: SetType;
  rpe: number | null;
  createdAt: string;
}

export interface WorkoutExercise {
  id: string;
  workoutId: string;
  exerciseId: string;
  order: number;
  supersetId: string | null;
  exercise: Exercise;
  sets: Set[];
}

export interface Workout {
  id: string;
  userId: string;
  routineId: string | null;
  title: string;
  notes: string | null;
  startedAt: string;
  finishedAt: string | null;
  isPublic: boolean;
  workoutExercises: WorkoutExercise[];
}

export interface RoutineSetConfig {
  setType: SetType;
  reps: number | null;
  weightKg: number | null;
}

export interface RoutineExercise {
  id: string;
  routineId: string;
  exerciseId: string;
  order: number;
  setsConfig: RoutineSetConfig[];
  exercise: Exercise;
}

export interface RoutineFolder {
  id: string;
  userId: string;
  name: string;
}

export interface Routine {
  id: string;
  userId: string | null;
  title: string;
  description: string | null;
  folderId: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  routineExercises: RoutineExercise[];
  folder: RoutineFolder | null;
}

export interface PersonalRecord {
  id: string;
  userId: string;
  exerciseId: string;
  weightKg: number;
  reps: number;
  oneRepMax: number;
  createdAt: string;
}

// ── API Responses ─────────────────────────────────────────────
export interface AuthResponse {
  user: User;
  access: string;
  refresh: string;
}

export interface PaginatedWorkouts {
  workouts: Workout[];
  total: number;
  page: number;
  limit: number;
}

export interface PaginatedExercises {
  exercises: Exercise[];
  total: number;
  page: number;
  limit: number;
}

export interface LogSetResponse {
  set: Set;
  isPr: boolean;
}
