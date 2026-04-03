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
import {
  setActiveWorkoutId,
  getActiveWorkoutId,
  clearActiveWorkoutId,
} from "@/lib/storage";
import type { SetType, Exercise } from "@/types/api";

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

  addExercise: (exercise: Exercise) => Promise<void>;
  removeExercise: (weId: string) => Promise<void>;

  addSet: (weId: string) => void;
  updateSetField: (
    weId: string,
    idx: number,
    field: keyof ActiveSet,
    value: string | number | boolean | SetType
  ) => void;
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
  const { supabase, user } = useAuth();
  const router = useRouter();

  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(
    null
  );
  const [exercises, setExercises] = useState<ActiveExercise[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showPrBanner, setShowPrBanner] = useState(false);
  const [prExerciseName, setPrExerciseName] = useState("");

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startTimer(startedAt: string) {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const base = Math.floor(
      (Date.now() - new Date(startedAt).getTime()) / 1000
    );
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

  useEffect(() => () => stopTimer(), []);

  // Restore active workout from localStorage
  useEffect(() => {
    const savedId = getActiveWorkoutId();
    if (savedId && !activeWorkout) {
      loadActiveWorkout(savedId).catch(() => clearActiveWorkoutId());
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchWorkoutExercises(workoutId: string): Promise<ActiveExercise[]> {
    const { data: wes } = await supabase
      .from("workout_exercises")
      .select("id, exercise_id, order, exercises(id, name)")
      .eq("workout_id", workoutId)
      .order("order");

    if (!wes) return [];

    const weIds = wes.map((we: Record<string, unknown>) => we.id as string);
    const { data: sets } = await supabase
      .from("sets")
      .select("*")
      .in("workout_exercise_id", weIds)
      .order("created_at");

    return wes.map((we: Record<string, unknown>) => {
      const exercise = we.exercises as unknown as Record<string, unknown>;
      const weSets = (sets ?? []).filter(
        (s: Record<string, unknown>) => s.workout_exercise_id === we.id
      );
      return {
        weId: we.id as string,
        exerciseId: we.exercise_id as string,
        name: (exercise?.name as string) ?? "",
        muscleGroups: (exercise?.muscle_groups as string[]) ?? [],
        sets: weSets.map((s: Record<string, unknown>) => ({
          id: s.id as string,
          reps: s.reps !== null ? String(s.reps) : "",
          weightKg: s.weight_kg !== null ? String(s.weight_kg) : "",
          setType: (s.set_type as SetType) ?? "normal",
          rpe: (s.rpe as number) ?? undefined,
          isPr: false,
          isSaved: true,
        })),
      };
    });
  }

  const loadActiveWorkout = useCallback(
    async (id: string) => {
      const { data: workout } = await supabase
        .from("workouts")
        .select("*")
        .eq("id", id)
        .single();

      if (!workout || workout.finished_at) {
        clearActiveWorkoutId();
        return;
      }
      setActiveWorkout({
        id: workout.id,
        title: workout.title,
        startedAt: workout.started_at,
      });
      const mapped = await fetchWorkoutExercises(workout.id);
      setExercises(mapped);
      startTimer(workout.started_at);
      setActiveWorkoutId(id);
    },
    [supabase] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const startWorkout = useCallback(
    async (routineId?: string) => {
      if (!user) return;
      const now = new Date().toISOString();

      // Ensure user row exists (FK workouts_user_id_fkey references public.users)
      const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
      await supabase.from("users").upsert({
        id: user.id,
        email: user.email ?? "",
        name: (meta.name as string) || (meta.full_name as string) || user.email?.split("@")[0] || "Athlete",
        username: (meta.username as string) || user.email?.split("@")[0] || null,
      }, { onConflict: "id" });

      const { data: workout, error: workoutErr } = await supabase
        .from("workouts")
        .insert({
          user_id: user.id,
          routine_id: routineId ?? null,
          title: "Workout",
          started_at: now,
        })
        .select()
        .single();

      if (!workout) {
        throw new Error(workoutErr?.message ?? "Failed to create workout");
      }

      // If starting from a routine, copy routine exercises
      if (routineId) {
        const { data: routineExercises } = await supabase
          .from("routine_exercises")
          .select("exercise_id, order")
          .eq("routine_id", routineId)
          .order("order");

        if (routineExercises && routineExercises.length > 0) {
          await supabase.from("workout_exercises").insert(
            routineExercises.map((re: Record<string, unknown>) => ({
              workout_id: workout.id,
              exercise_id: re.exercise_id,
              order: re.order,
            }))
          );
        }
      }

      setActiveWorkout({
        id: workout.id,
        title: workout.title,
        startedAt: workout.started_at,
      });
      const mapped = await fetchWorkoutExercises(workout.id);
      setExercises(mapped);
      startTimer(workout.started_at);
      setActiveWorkoutId(workout.id);
    },
    [supabase, user] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const finishWorkout = useCallback(async () => {
    if (!activeWorkout) return;
    await supabase
      .from("workouts")
      .update({ finished_at: new Date().toISOString() })
      .eq("id", activeWorkout.id);
    const finishedId = activeWorkout.id;
    stopTimer();
    clearActiveWorkoutId();
    setActiveWorkout(null);
    setExercises([]);
    router.push(`/workouts/${finishedId}`);
  }, [activeWorkout, supabase, router]);

  const discardWorkout = useCallback(async () => {
    if (!activeWorkout) return;
    await supabase.from("workouts").delete().eq("id", activeWorkout.id);
    stopTimer();
    clearActiveWorkoutId();
    setActiveWorkout(null);
    setExercises([]);
    router.replace("/");
  }, [activeWorkout, supabase, router]);

  const updateTitle = useCallback(
    (title: string) => {
      setActiveWorkout((w) => (w ? { ...w, title } : w));
      if (activeWorkout) {
        supabase
          .from("workouts")
          .update({ title })
          .eq("id", activeWorkout.id)
          .then(() => {});
      }
    },
    [activeWorkout, supabase]
  );

  const addExercise = useCallback(
    async (exercise: Exercise) => {
      if (!activeWorkout) return;

      // Upsert exercise by name to get a stable UUID
      let exerciseUuid: string;
      const { data: existing } = await supabase
        .from("exercises")
        .select("id")
        .ilike("name", exercise.name)
        .limit(1)
        .single();

      if (existing?.id) {
        exerciseUuid = existing.id;
      } else {
        const { data: inserted, error: insertErr } = await supabase
          .from("exercises")
          .insert({
            name: exercise.name,
            muscle_groups: exercise.muscleGroups,
            equipment: exercise.equipment,
            instructions: exercise.instructions,
            video_url: exercise.videoUrl,
            is_custom: false,
            created_by_user_id: user?.id ?? null,
          })
          .select("id")
          .single();
        const missingMuscleGroupsColumn = Boolean(
          insertErr?.message?.includes("muscle_groups") && insertErr?.message?.includes("schema cache")
        );
        if (inserted?.id) {
          exerciseUuid = inserted.id;
        } else if (missingMuscleGroupsColumn) {
          const { data: fallbackInserted, error: fallbackErr } = await supabase
            .from("exercises")
            .insert({ name: exercise.name, created_by_user_id: user?.id ?? null })
            .select("id")
            .single();
          if (fallbackErr || !fallbackInserted) return;
          exerciseUuid = fallbackInserted.id;
        } else {
          return;
        }
      }

      const nextOrder = exercises.length;
      const { data: we, error } = await supabase
        .from("workout_exercises")
        .insert({
          workout_id: activeWorkout.id,
          exercise_id: exerciseUuid,
          order: nextOrder,
        })
        .select("id, exercise_id")
        .single();

      if (error || !we) return;
      setExercises((prev) => [
        ...prev,
        {
          weId: we.id,
          exerciseId: exerciseUuid,
          name: exercise.name,
          muscleGroups: exercise.muscleGroups,
          sets: [],
        },
      ]);
    },
    [activeWorkout, exercises.length, supabase]
  );

  const removeExercise = useCallback(
    async (weId: string) => {
      if (!activeWorkout) return;
      await supabase.from("workout_exercises").delete().eq("id", weId);
      setExercises((prev) => prev.filter((e) => e.weId !== weId));
    },
    [activeWorkout, supabase]
  );

  const addSet = useCallback((weId: string) => {
    setExercises((prev) =>
      prev.map((e) =>
        e.weId === weId
          ? {
              ...e,
              sets: [
                ...e.sets,
                {
                  reps: "",
                  weightKg: "",
                  setType: "normal" as SetType,
                  isPr: false,
                  isSaved: false,
                },
              ],
            }
          : e
      )
    );
  }, []);

  const updateSetField = useCallback(
    (
      weId: string,
      idx: number,
      field: keyof ActiveSet,
      value: string | number | boolean | SetType
    ) => {
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

  const saveSet = useCallback(
    async (weId: string, idx: number) => {
      if (!activeWorkout) return;
      const exercise = exercises.find((e) => e.weId === weId);
      if (!exercise) return;
      const set = exercise.sets[idx];
      if (!set) return;

      const reps = parseInt(set.reps) || null;
      const weightKg =
        parseFloat(set.weightKg) >= 0 ? parseFloat(set.weightKg) : null;

      const { data: savedSet, error } = await supabase
        .from("sets")
        .insert({
          workout_exercise_id: weId,
          reps,
          weight_kg: weightKg,
          set_type: set.setType,
          rpe: set.rpe ?? null,
        })
        .select()
        .single();

      if (error || !savedSet) return;

      // Check for PR
      let isPr = false;
      if (reps && weightKg && weightKg > 0) {
        const { data: prevSets } = await supabase
          .from("sets")
          .select("weight_kg, reps, workout_exercises!inner(exercise_id)")
          .eq("workout_exercises.exercise_id", exercise.exerciseId)
          .not("id", "eq", savedSet.id);

        if (prevSets) {
          const prevMax = Math.max(
            0,
            ...prevSets.map(
              (s: Record<string, unknown>) =>
                ((s.weight_kg as number) ?? 0) *
                (1 + ((s.reps as number) ?? 0) / 30)
            )
          );
          const current1RM = weightKg * (1 + reps / 30);
          isPr = current1RM > prevMax && prevSets.length > 0;
        }
      }

      setExercises((prev) =>
        prev.map((e) => {
          if (e.weId !== weId) return e;
          const sets = [...e.sets];
          const existing = sets[idx];
          if (!existing) return e;
          sets[idx] = {
            ...existing,
            id: savedSet.id,
            isSaved: true,
            isPr,
            reps: savedSet.reps !== null ? String(savedSet.reps) : set.reps,
            weightKg:
              savedSet.weight_kg !== null
                ? String(savedSet.weight_kg)
                : set.weightKg,
          };
          return { ...e, sets };
        })
      );

      if (isPr) {
        setPrExerciseName(exercise.name);
        setShowPrBanner(true);
        setTimeout(() => setShowPrBanner(false), 3500);
      }
    },
    [activeWorkout, exercises, supabase]
  );

  const deleteSet = useCallback(
    async (weId: string, setId: string) => {
      await supabase.from("sets").delete().eq("id", setId);
      setExercises((prev) =>
        prev.map((e) =>
          e.weId === weId
            ? { ...e, sets: e.sets.filter((s) => s.id !== setId) }
            : e
        )
      );
    },
    [supabase]
  );

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
