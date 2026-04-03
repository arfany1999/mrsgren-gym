"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
  previousSets: Array<{ reps: string; weightKg: string }>;
}

export interface ActiveWorkout {
  id: string;
  title: string;
  startedAt: string;
}

interface WorkoutContextValue {
  activeWorkout: ActiveWorkout | null;
  exercises: ActiveExercise[];
  showPrBanner: boolean;
  prExerciseName: string;
  router: ReturnType<typeof useRouter>;

  startWorkout: (routineId?: string) => Promise<void>;
  loadActiveWorkout: (id: string) => Promise<void>;
  finishWorkout: () => Promise<string | null>;
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
  const [showPrBanner, setShowPrBanner] = useState(false);
  const [prExerciseName, setPrExerciseName] = useState("");

  function stopTimer() { /* no-op — timer is local to WorkoutTimer component */ }

  useEffect(() => () => { /* cleanup on unmount */ }, []);

  // Restore active workout from localStorage
  useEffect(() => {
    const savedId = getActiveWorkoutId();
    if (savedId && !activeWorkout) {
      loadActiveWorkout(savedId).catch(() => clearActiveWorkoutId());
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Batched: 3 queries total regardless of exercise count (was 3 per exercise)
  async function fetchAllPreviousPerformance(
    exerciseIds: string[],
    currentWorkoutId: string
  ): Promise<Map<string, Array<{ reps: string; weightKg: string }>>> {
    if (exerciseIds.length === 0) return new Map();
    try {
      const { data: wes } = await supabase
        .from("workout_exercises")
        .select("id, exercise_id, workout_id")
        .in("exercise_id", exerciseIds)
        .neq("workout_id", currentWorkoutId);
      if (!wes || wes.length === 0) return new Map();

      const workoutIds = [...new Set(wes.map((we) => we.workout_id as string))];
      const { data: pastWorkouts } = await supabase
        .from("workouts")
        .select("id, finished_at")
        .in("id", workoutIds)
        .not("finished_at", "is", null)
        .order("finished_at", { ascending: false });
      if (!pastWorkouts || pastWorkouts.length === 0) return new Map();

      const weIdsToFetch: string[] = [];
      const weIdToExerciseId = new Map<string, string>();
      for (const exerciseId of exerciseIds) {
        const exerciseWes = wes.filter((we) => (we.exercise_id as string) === exerciseId);
        for (const pw of pastWorkouts) {
          const match = exerciseWes.find((we) => (we.workout_id as string) === (pw.id as string));
          if (match) {
            weIdsToFetch.push(match.id as string);
            weIdToExerciseId.set(match.id as string, exerciseId);
            break;
          }
        }
      }
      if (weIdsToFetch.length === 0) return new Map();

      const { data: allSets } = await supabase
        .from("workout_sets")
        .select("workout_exercise_id, weight, reps, order_index")
        .in("workout_exercise_id", weIdsToFetch)
        .order("order_index");

      const result = new Map<string, Array<{ reps: string; weightKg: string }>>();
      for (const weId of weIdsToFetch) {
        const exerciseId = weIdToExerciseId.get(weId)!;
        result.set(exerciseId, (allSets ?? [])
          .filter((s) => (s.workout_exercise_id as string) === weId)
          .map((s) => ({
            reps: s.reps !== null ? String(s.reps) : "",
            weightKg: s.weight !== null ? String(s.weight) : "",
          })));
      }
      return result;
    } catch {
      return new Map();
    }
  }

  // Single-exercise version (used when adding an exercise mid-workout)
  async function fetchPreviousPerformance(
    exerciseId: string,
    currentWorkoutId: string
  ): Promise<Array<{ reps: string; weightKg: string }>> {
    const map = await fetchAllPreviousPerformance([exerciseId], currentWorkoutId);
    return map.get(exerciseId) ?? [];
  }

  async function fetchWorkoutExercises(workoutId: string): Promise<ActiveExercise[]> {
    const { data: wes } = await supabase
      .from("workout_exercises")
      .select("id, exercise_id, order_index, exercises(id, name)")
      .eq("workout_id", workoutId)
      .order("order_index");

    if (!wes) return [];

    const weIds = wes.map((we: Record<string, unknown>) => we.id as string);
    const { data: sets } = await supabase
      .from("workout_sets")
      .select("*")
      .in("workout_exercise_id", weIds)
      .order("order_index");

    const baseExercises = wes.map((we: Record<string, unknown>) => {
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
          weightKg: s.weight !== null ? String(s.weight) : "",
          setType: (s.set_type as SetType) ?? "normal",
          rpe: (s.rpe as number) ?? undefined,
          isPr: (s.is_pr as boolean) ?? false,
          isSaved: (s.is_completed as boolean) ?? false,
        })),
        previousSets: [] as Array<{ reps: string; weightKg: string }>,
      };
    });

    // Fetch previous performance for all exercises in 3 queries (batched)
    const prevMap = await fetchAllPreviousPerformance(
      baseExercises.map((ex) => ex.exerciseId),
      workoutId
    );
    return baseExercises.map((ex) => ({ ...ex, previousSets: prevMap.get(ex.exerciseId) ?? [] }));
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
      setActiveWorkoutId(id);
    },
    [supabase] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const startWorkout = useCallback(
    async (routineId?: string) => {
      if (!user) return;
      const now = new Date().toISOString();

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

      let workoutTitle: string = workout.title as string;

      // If starting from a routine, copy exercises + pre-populate sets
      if (routineId) {
        const [{ data: routine }, { data: routineExercises }] = await Promise.all([
          supabase.from("routines").select("name").eq("id", routineId).single(),
          supabase
            .from("routine_exercises")
            .select("exercise_id, order_index, sets, reps, weight")
            .eq("routine_id", routineId)
            .order("order_index"),
        ]);

        if (routine?.name) {
          workoutTitle = routine.name as string;
          await supabase.from("workouts").update({ title: workoutTitle }).eq("id", workout.id);
        }

        if (routineExercises && routineExercises.length > 0) {
          const { data: insertedWEs } = await supabase
            .from("workout_exercises")
            .insert(
              routineExercises.map((re: Record<string, unknown>) => ({
                workout_id: workout.id,
                exercise_id: re.exercise_id,
                order_index: re.order_index,
              }))
            )
            .select("id, exercise_id, order_index");

          // Pre-create workout_sets from reps/weight so user just ticks them off
          if (insertedWEs && insertedWEs.length > 0) {
            const allSetRows: Array<Record<string, unknown>> = [];
            for (const we of insertedWEs as Array<Record<string, unknown>>) {
              const re = routineExercises.find(
                (r: Record<string, unknown>) =>
                  r.exercise_id === we.exercise_id && r.order_index === we.order_index
              );
              if (!re) continue;
              const setsCount = (re.sets as number) ?? 3;
              const defaultReps = (re.reps as number) ?? null;
              const defaultWeight = (re.weight as number) ?? null;

              for (let idx = 0; idx < setsCount; idx++) {
                allSetRows.push({
                  workout_exercise_id: we.id,
                  reps: defaultReps,
                  weight: defaultWeight,
                  set_type: "normal",
                  is_completed: false,
                  order_index: idx,
                });
              }
            }
            if (allSetRows.length > 0) {
              await supabase.from("workout_sets").insert(allSetRows);
            }
          }
        }
      }

      setActiveWorkout({
        id: workout.id,
        title: workoutTitle,
        startedAt: workout.started_at,
      });
      const mapped = await fetchWorkoutExercises(workout.id);
      setExercises(mapped);
      setActiveWorkoutId(workout.id);
    },
    [supabase, user] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const finishWorkout = useCallback(async () => {
    if (!activeWorkout) return null;
    await supabase
      .from("workouts")
      .update({ finished_at: new Date().toISOString() })
      .eq("id", activeWorkout.id);
    const finishedId = activeWorkout.id;
    stopTimer();
    clearActiveWorkoutId();
    setActiveWorkout(null);
    setExercises([]);
    return finishedId;
  }, [activeWorkout, supabase]);

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
          order_index: nextOrder,
        })
        .select("id, exercise_id")
        .single();

      if (error || !we) return;
      const prevSets = await fetchPreviousPerformance(exerciseUuid, activeWorkout.id);
      setExercises((prev) => [
        ...prev,
        {
          weId: we.id,
          exerciseId: exerciseUuid,
          name: exercise.name,
          muscleGroups: exercise.muscleGroups,
          sets: [],
          previousSets: prevSets,
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

      let savedSetId = set.id;

      if (set.id) {
        // Pre-created set from routine — just mark completed + update values
        await supabase
          .from("workout_sets")
          .update({ reps, weight: weightKg, is_completed: true })
          .eq("id", set.id);
      } else {
        // Manually added set — insert new row
        const existingSets = exercise.sets.filter((s) => s.isSaved);
        const orderIndex = existingSets.length;
        const { data: savedSet, error } = await supabase
          .from("workout_sets")
          .insert({
            workout_exercise_id: weId,
            reps,
            weight: weightKg,
            set_type: set.setType,
            rpe: set.rpe ?? null,
            is_pr: false,
            is_completed: true,
            order_index: orderIndex,
          })
          .select()
          .single();
        if (error || !savedSet) return;
        savedSetId = savedSet.id;
      }

      // Check for PR
      let isPr = false;
      if (reps && weightKg && weightKg > 0 && savedSetId) {
        const { data: prevSets } = await supabase
          .from("workout_sets")
          .select("weight, reps, workout_exercises!inner(exercise_id)")
          .eq("workout_exercises.exercise_id", exercise.exerciseId)
          .not("id", "eq", savedSetId);

        if (prevSets) {
          const prevMax = Math.max(
            0,
            ...prevSets.map(
              (s: Record<string, unknown>) =>
                ((s.weight as number) ?? 0) *
                (1 + ((s.reps as number) ?? 0) / 30)
            )
          );
          const current1RM = weightKg * (1 + reps / 30);
          isPr = current1RM > prevMax && prevSets.length > 0;
        }
      }

      if (isPr && savedSetId) {
        await supabase.from("workout_sets").update({ is_pr: true }).eq("id", savedSetId);
      }

      setExercises((prev) =>
        prev.map((e) => {
          if (e.weId !== weId) return e;
          const sets = [...e.sets];
          const existing = sets[idx];
          if (!existing) return e;
          sets[idx] = {
            ...existing,
            id: savedSetId,
            isSaved: true,
            isPr,
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
      await supabase.from("workout_sets").delete().eq("id", setId);
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

  const value = useMemo(() => ({
    activeWorkout,
    exercises,
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
  }), [activeWorkout, exercises, showPrBanner, prExerciseName, router, startWorkout, loadActiveWorkout, finishWorkout, discardWorkout, updateTitle, addExercise, removeExercise, addSet, updateSetField, saveSet, deleteSet, clearPrBanner]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <WorkoutContext.Provider value={value}>
      {children}
    </WorkoutContext.Provider>
  );
}
