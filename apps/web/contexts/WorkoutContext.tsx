"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { setActiveWorkoutId, getActiveWorkoutId, clearActiveWorkoutId } from "@/lib/storage";
import type { SetType, Workout } from "@/types/api";

// ── Types ─────────────────────────────────────────────────────
export interface ActiveSet {
  id?: string;
  reps: string;
  weightKg: string;
  setType: SetType;
  rpe?: number;
  isPr: boolean;
  isSaved: boolean;
}

export interface ActiveExercise {
  weId: string;
  exerciseId: string;
  name: string;
  muscleGroups: string[];
  sets: ActiveSet[];
}

export interface ActiveWorkout {
  id: string;
  title: string;
  startedAt: string;
}

interface WorkoutContextValue {
  activeWorkout: ActiveWorkout | null;
  exercises: ActiveExercise[];
  elapsedSeconds: number;
  showPrBanner: boolean;
  prExerciseName: string;
  router: ReturnType<typeof useRouter>;

  startWorkout: (routineId?: string) => Promise<void>;
  loadActiveWorkout: (id: string) => Promise<void>;
  finishWorkout: () => Promise<void>;
  discardWorkout: () => Promise<void>;
  updateTitle: (title: string) => void;

  addExercise: (exerciseId: string) => Promise<void>;
  removeExercise: (weId: string) => Promise<void>;

  addSet: (weId: string) => void;
  updateSetField: (weId: string, idx: number, field: keyof ActiveSet, value: string | number | boolean | SetType) => void;
  saveSet: (weId: string, idx: number) => Promise<void>;
  deleteSet: (weId: string, setId: string) => Promise<void>;
  clearPrBanner: () => void;
}

const WorkoutContext = createContext<WorkoutContextValue | null>(null);

export function useWorkout(): WorkoutContextValue {
  const ctx = useContext(WorkoutContext);
  if (!ctx) throw new Error("useWorkout must be used inside <WorkoutProvider>");
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────
export function WorkoutProvider({ children }: { children: React.ReactNode }) {
  const { api } = useAuth();
  const router = useRouter();

  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(null);
  const [exercises, setExercises] = useState<ActiveExercise[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showPrBanner, setShowPrBanner] = useState(false);
  const [prExerciseName, setPrExerciseName] = useState("");

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start timer
  function startTimer(startedAt: string) {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const base = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
    setElapsedSeconds(base);
    intervalRef.current = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
  }

  function stopTimer() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setElapsedSeconds(0);
  }

  // On unmount clean up timer
  useEffect(() => () => stopTimer(), []);

  // Try to restore active workout from localStorage on mount
  useEffect(() => {
    const savedId = getActiveWorkoutId();
    if (savedId && !activeWorkout) {
      loadActiveWorkout(savedId).catch(() => clearActiveWorkoutId());
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function workoutToState(workout: Workout) {
    const mapped: ActiveExercise[] = workout.workoutExercises.map((we) => ({
      weId: we.id,
      exerciseId: we.exerciseId,
      name: we.exercise.name,
      muscleGroups: we.exercise.muscleGroups,
      sets: we.sets.map((s) => ({
        id: s.id,
        reps: s.reps !== null ? String(s.reps) : "",
        weightKg: s.weightKg !== null ? String(s.weightKg) : "",
        setType: s.setType,
        rpe: s.rpe ?? undefined,
        isPr: false,
        isSaved: true,
      })),
    }));
    return mapped;
  }

  const loadActiveWorkout = useCallback(async (id: string) => {
    const workout = await api.get<Workout>(`/workouts/${id}`);
    if (workout.finishedAt) {
      clearActiveWorkoutId();
      return;
    }
    setActiveWorkout({ id: workout.id, title: workout.title, startedAt: workout.startedAt });
    setExercises(workoutToState(workout));
    startTimer(workout.startedAt);
    setActiveWorkoutId(id);
  }, [api]); // eslint-disable-line react-hooks/exhaustive-deps

  const startWorkout = useCallback(async (routineId?: string) => {
    const body = routineId ? { routineId, title: "Workout" } : { title: "Workout" };
    const workout = await api.post<Workout>("/workouts", body);
    setActiveWorkout({ id: workout.id, title: workout.title, startedAt: workout.startedAt });
    setExercises(workoutToState(workout));
    startTimer(workout.startedAt);
    setActiveWorkoutId(workout.id);
  }, [api]); // eslint-disable-line react-hooks/exhaustive-deps

  const finishWorkout = useCallback(async () => {
    if (!activeWorkout) return;
    await api.patch(`/workouts/${activeWorkout.id}`, { finishedAt: new Date().toISOString() });
    const finishedId = activeWorkout.id;
    stopTimer();
    clearActiveWorkoutId();
    setActiveWorkout(null);
    setExercises([]);
    router.push(`/workouts/${finishedId}`);
  }, [activeWorkout, api, router]);

  const discardWorkout = useCallback(async () => {
    if (!activeWorkout) return;
    await api.delete(`/workouts/${activeWorkout.id}`);
    stopTimer();
    clearActiveWorkoutId();
    setActiveWorkout(null);
    setExercises([]);
    router.replace("/");
  }, [activeWorkout, api, router]);

  const updateTitle = useCallback((title: string) => {
    setActiveWorkout((w) => w ? { ...w, title } : w);
    if (activeWorkout) {
      api.patch(`/workouts/${activeWorkout.id}`, { title }).catch(() => {});
    }
  }, [activeWorkout, api]);

  const addExercise = useCallback(async (exerciseId: string) => {
    if (!activeWorkout) return;
    const we = await api.post<{ id: string; exerciseId: string; order: number; exercise: { name: string; muscleGroups: string[] }; sets: unknown[] }>(
      `/workouts/${activeWorkout.id}/exercises`,
      { exerciseId }
    );
    setExercises((prev) => [
      ...prev,
      {
        weId: we.id,
        exerciseId: we.exerciseId,
        name: we.exercise.name,
        muscleGroups: we.exercise.muscleGroups,
        sets: [],
      },
    ]);
  }, [activeWorkout, api]);

  const removeExercise = useCallback(async (weId: string) => {
    if (!activeWorkout) return;
    await api.delete(`/workouts/${activeWorkout.id}/exercises/${weId}`);
    setExercises((prev) => prev.filter((e) => e.weId !== weId));
  }, [activeWorkout, api]);

  const addSet = useCallback((weId: string) => {
    setExercises((prev) =>
      prev.map((e) =>
        e.weId === weId
          ? {
              ...e,
              sets: [
                ...e.sets,
                { reps: "", weightKg: "", setType: "normal", isPr: false, isSaved: false },
              ],
            }
          : e
      )
    );
  }, []);

  const updateSetField = useCallback(
    (weId: string, idx: number, field: keyof ActiveSet, value: string | number | boolean | SetType) => {
      setExercises((prev) =>
        prev.map((e) => {
          if (e.weId !== weId) return e;
          const sets = [...e.sets];
          const existing = sets[idx];
          if (!existing) return e;
          sets[idx] = { ...existing, [field]: value } as ActiveSet;
          return { ...e, sets };
        })
      );
    },
    []
  );

  const saveSet = useCallback(async (weId: string, idx: number) => {
    if (!activeWorkout) return;
    const exercise = exercises.find((e) => e.weId === weId);
    if (!exercise) return;
    const set = exercise.sets[idx];
    if (!set) return;

    const reps = parseInt(set.reps) || undefined;
    const weightKg = parseFloat(set.weightKg) >= 0 ? parseFloat(set.weightKg) : undefined;

    const body: Record<string, unknown> = { setType: set.setType };
    if (reps && reps > 0) body.reps = reps;
    if (weightKg !== undefined) body.weightKg = weightKg;
    if (set.rpe) body.rpe = set.rpe;

    const res = await api.post<{ set: { id: string; reps: number | null; weightKg: number | null; setType: SetType; rpe: number | null; createdAt: string; workoutExerciseId: string }; isPr: boolean }>(
      `/workouts/${activeWorkout.id}/exercises/${weId}/sets`,
      body
    );

    setExercises((prev) =>
      prev.map((e) => {
        if (e.weId !== weId) return e;
        const sets = [...e.sets];
        const existing = sets[idx];
        if (!existing) return e;
        sets[idx] = {
          ...existing,
          id: res.set.id,
          isSaved: true,
          isPr: res.isPr,
          reps: res.set.reps !== null ? String(res.set.reps) : set.reps,
          weightKg: res.set.weightKg !== null ? String(res.set.weightKg) : set.weightKg,
        };
        return { ...e, sets };
      })
    );

    if (res.isPr) {
      setPrExerciseName(exercise.name);
      setShowPrBanner(true);
      setTimeout(() => setShowPrBanner(false), 3500);
    }
  }, [activeWorkout, api, exercises]);

  const deleteSet = useCallback(async (weId: string, setId: string) => {
    await api.delete(`/sets/${setId}`);
    setExercises((prev) =>
      prev.map((e) =>
        e.weId === weId
          ? { ...e, sets: e.sets.filter((s) => s.id !== setId) }
          : e
      )
    );
  }, [api]);

  const clearPrBanner = useCallback(() => setShowPrBanner(false), []);

  return (
    <WorkoutContext.Provider
      value={{
        activeWorkout,
        exercises,
        elapsedSeconds,
        showPrBanner,
        prExerciseName,
        router,
        startWorkout,
        loadActiveWorkout,
        finishWorkout,
        discardWorkout,
        updateTitle,
        addExercise,
        removeExercise,
        addSet,
        updateSetField,
        saveSet,
        deleteSet,
        clearPrBanner,
      }}
    >
      {children}
    </WorkoutContext.Provider>
  );
}
