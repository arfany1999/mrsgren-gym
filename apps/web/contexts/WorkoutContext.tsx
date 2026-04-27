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
import { parseMuscleGroup } from "@/lib/formatters";
import { getMeasurementType, resolveMeasurementType, type MeasurementType } from "@/lib/exercises-data";
import { fetchPRsForExercises } from "@/lib/exerciseHistory";
import { enqueue as queueMutation, startOnlineAutoFlush } from "@/lib/offlineQueue";

// ── Types ─────────────────────────────────────────────────────
export interface ActiveSet {
  id?: string;
  reps: string;
  weightKg: string;
  duration: string;   // seconds (timed) or minutes (cardio)
  distance: string;   // km (cardio)
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
  measurementType: MeasurementType;
  sets: ActiveSet[];
  previousSets: Array<{ reps: string; weightKg: string }>;
  personalRecord?: { weight: number; reps: number; estimated1rm: number };
}

export interface ActiveWorkout {
  id: string;
  title: string;
  startedAt: string;
}

export interface PreloadedExercise {
  exerciseId: string;
  name: string;
  muscleGroups: string[];
  setsConfig: Array<{ reps: number | null; weightKg: number | null }>;
}

export interface PreloadedRoutine {
  title?: string;
  exercises?: PreloadedExercise[];
}

interface WorkoutContextValue {
  activeWorkout: ActiveWorkout | null;
  exercises: ActiveExercise[];
  showPrBanner: boolean;
  prExerciseName: string;
  router: ReturnType<typeof useRouter>;

  startWorkout: (routineId?: string, preloaded?: PreloadedRoutine) => Promise<void>;
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

  // Always-fresh ref for hot-path callbacks (saveSet etc.) so they don't
  // need `exercises` in their dep array. Listing `exercises` there causes
  // the callback identity to churn on every keystroke, breaking memoization
  // of SetRow/ExerciseBlock and triggering keystroke-cascade rerenders.
  const exercisesRef = useRef<ActiveExercise[]>([]);
  useEffect(() => { exercisesRef.current = exercises; }, [exercises]);

  function stopTimer() { /* no-op — timer is local to WorkoutTimer component */ }

  // Start the offline-queue auto-flush whenever the provider is mounted
  useEffect(() => {
    return startOnlineAutoFlush(supabase);
  }, [supabase]);

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
      .select("id, exercise_id, order_index, exercises(id, name, muscle_group)")
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
      const exName = (exercise?.name as string) ?? "";
      // Coerce the DB value through the validated resolver — guards against
      // historical rows with null/empty/typo'd `measurement_type` (a common
      // cause of "no KG or sets inputs" for shoulder exercises that were
      // originally seeded by the free-exercise-db picker).
      const measurementType: MeasurementType = resolveMeasurementType(
        exercise?.measurement_type,
        exName,
      );
      return {
        weId: we.id as string,
        exerciseId: we.exercise_id as string,
        name: exName,
        muscleGroups: parseMuscleGroup(exercise?.muscle_group),
        measurementType,
        sets: weSets.map((s: Record<string, unknown>) => {
          // For cardio: duration (mins) is stored in `reps`, distance (km) in `weight`
          const isCardioSet = measurementType === "cardio";
          return {
            id: s.id as string,
            reps: isCardioSet ? "" : (s.reps !== null ? String(s.reps) : ""),
            weightKg: isCardioSet ? "" : (s.weight !== null ? String(s.weight) : ""),
            duration: isCardioSet
              ? (s.reps !== null ? String(s.reps) : "")
              : (s.duration_seconds != null ? String(s.duration_seconds) : ""),
            distance: isCardioSet
              ? (s.weight !== null ? String(s.weight) : "")
              : (s.distance_km != null ? String(s.distance_km) : ""),
            setType: (s.set_type as SetType) ?? "normal",
            rpe: (s.rpe as number) ?? undefined,
            isPr: (s.is_pr as boolean) ?? false,
            isSaved: (s.is_completed as boolean) ?? false,
          };
        }),
        previousSets: [] as Array<{ reps: string; weightKg: string }>,
      };
    });

    // Fetch previous performance + PRs for all exercises (batched)
    const exIds = baseExercises.map((ex) => ex.exerciseId);
    const [prevMap, prMap] = await Promise.all([
      fetchAllPreviousPerformance(exIds, workoutId),
      fetchPRsForExercises(supabase, exIds),
    ]);
    return baseExercises.map((ex) => {
      const pr = prMap.get(ex.exerciseId);
      return {
        ...ex,
        previousSets: prevMap.get(ex.exerciseId) ?? [],
        personalRecord: pr ? { weight: pr.weight, reps: pr.reps, estimated1rm: pr.estimated1rm } : undefined,
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
      setActiveWorkoutId(id);
    },
    [supabase] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const startWorkout = useCallback(
    async (routineId?: string, preloaded?: PreloadedRoutine) => {
      if (!user) return;
      const now = new Date().toISOString();

      const { data: workout, error: workoutErr } = await supabase
        .from("workouts")
        .insert({
          user_id: user.id,
          routine_id: routineId ?? null,
          title: preloaded?.title ?? "Workout",
          started_at: now,
        })
        .select()
        .single();

      if (!workout) {
        throw new Error(workoutErr?.message ?? "Failed to create workout");
      }

      // Set active state immediately — show preloaded exercises for instant UI
      setActiveWorkout({
        id: workout.id,
        title: (preloaded?.title ?? workout.title) as string,
        startedAt: workout.started_at,
      });

      if (preloaded?.exercises?.length) {
        setExercises(preloaded.exercises.map((re, idx) => ({
          weId: `temp-${idx}`,
          exerciseId: re.exerciseId,
          name: re.name,
          muscleGroups: re.muscleGroups,
          measurementType: getMeasurementType(re.name),
          sets: re.setsConfig.map(s => ({
            reps: s.reps != null ? String(s.reps) : "",
            weightKg: s.weightKg != null ? String(s.weightKg) : "",
            duration: "",
            distance: "",
            setType: "normal" as SetType,
            isPr: false,
            isSaved: false,
          })),
          previousSets: [],
        })));
      } else {
        setExercises([]);
      }

      setActiveWorkoutId(workout.id);

      // Persist to DB in background (non-blocking) and reconcile with real IDs
      if (routineId) {
        (async () => {
          try {
            const [{ data: routine }, { data: routineExercises }] = await Promise.all([
              supabase.from("routines").select("name").eq("id", routineId).single(),
              supabase
                .from("routine_exercises")
                .select("exercise_id, order_index, sets_config, exercises(id, name, muscle_group)")
                .eq("routine_id", routineId)
                .order("order_index"),
            ]);

            if (routine?.name && !preloaded?.title) {
              const workoutTitle = routine.name as string;
              setActiveWorkout((w) => (w ? { ...w, title: workoutTitle } : w));
              await supabase.from("workouts").update({ title: workoutTitle }).eq("id", workout.id);
            }

            if (routineExercises && routineExercises.length > 0) {
              const { data: insertedWEs } = await supabase
                .from("workout_exercises")
                .insert(
                  routineExercises.map((re: Record<string, unknown>, idx: number) => ({
                    workout_id: workout.id,
                    exercise_id: re.exercise_id,
                    order_index: (re.order_index ?? idx) as number,
                  }))
                )
                .select("id, exercise_id, order_index");

              if (insertedWEs && insertedWEs.length > 0) {
                const allSetRows: Array<Record<string, unknown>> = [];
                for (const we of insertedWEs as Array<Record<string, unknown>>) {
                  const re = routineExercises.find(
                    (r: Record<string, unknown>) => r.exercise_id === we.exercise_id
                  );
                  if (!re) continue;

                  const setsConfig = re.sets_config as Array<Record<string, unknown>> | null;
                  const setsArr: Record<string, unknown>[] = Array.isArray(setsConfig) && setsConfig.length > 0
                    ? setsConfig
                    : Array.from({ length: 3 }, (): Record<string, unknown> => ({}));

                  const reEx = (re.exercises as unknown as Record<string, unknown>) ?? {};
                  const exNameForType = (reEx.name as string) ?? "";
                  const isCardioExercise = getMeasurementType(exNameForType) === "cardio";

                  setsArr.forEach((s, idx) => {
                    allSetRows.push({
                      workout_exercise_id: we.id,
                      reps: isCardioExercise
                        ? ((s.duration as number) ?? null)
                        : ((s.reps as number) ?? null),
                      weight: isCardioExercise
                        ? ((s.distance as number) ?? null)
                        : ((s.weight as number) ?? null),
                      set_type: "normal",
                      is_pr: false,
                      is_completed: false,
                      order_index: idx,
                    });
                  });
                }
                if (allSetRows.length > 0) {
                  await supabase.from("workout_sets").insert(allSetRows);
                }
              }
            }

            const mapped = await fetchWorkoutExercises(workout.id);
            // Reconcile: merge real DB IDs while preserving any values user entered
            setExercises(prev => {
              const hasEdits = prev.some(ex => ex.sets.some(s => s.reps || s.weightKg || s.isSaved));
              if (!hasEdits) return mapped;
              return mapped.map((newEx, i) => {
                const prevEx = prev[i];
                if (!prevEx) return newEx;
                return {
                  ...newEx,
                  sets: newEx.sets.map((newSet, si) => {
                    const prevSet = prevEx.sets[si];
                    if (!prevSet || !(prevSet.reps || prevSet.weightKg || prevSet.isSaved)) return newSet;
                    return { ...newSet, reps: prevSet.reps, weightKg: prevSet.weightKg, duration: prevSet.duration, distance: prevSet.distance, isSaved: prevSet.isSaved };
                  }),
                };
              });
            });
          } catch (e) {
            console.error("Background routine load failed:", e);
          }
        })();
      }
    },
    [supabase, user] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const finishWorkout = useCallback(async () => {
    if (!activeWorkout) return null;

    const finishedAt = new Date().toISOString();
    const durationSecs = Math.floor(
      (new Date(finishedAt).getTime() - new Date(activeWorkout.startedAt).getTime()) / 1000
    );

    // Compute total volume from completed sets
    const totalVolume = exercises.reduce((sum, e) =>
      sum + e.sets.filter(s => s.isSaved).reduce((v, s) =>
        v + (parseFloat(s.weightKg) || 0) * (parseInt(s.reps) || 0), 0), 0);

    const finishPayload = {
      finished_at: finishedAt,
      duration_secs: durationSecs,
      total_volume: totalVolume > 0 ? Math.round(totalVolume) : null,
    };
    try {
      const { error } = await supabase.from("workouts").update(finishPayload).eq("id", activeWorkout.id);
      if (error) throw error;
    } catch {
      await queueMutation("updateWorkout", { workoutId: activeWorkout.id, data: finishPayload });
    }

    const finishedId = activeWorkout.id;
    stopTimer();
    clearActiveWorkoutId();
    setActiveWorkout(null);
    setExercises([]);
    return finishedId;
  }, [activeWorkout, exercises, supabase]);

  const discardWorkout = useCallback(async () => {
    if (!activeWorkout) return;
    clearActiveWorkoutId();
    setActiveWorkout(null);
    setExercises([]);
    // Delete from DB in background — don't block navigation
    supabase.from("workouts").delete().eq("id", activeWorkout.id).then(() => {});
  }, [activeWorkout, supabase]);

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
        // RLS on `exercises` requires `created_by_user_id = auth.uid()`. The
        // earlier code used `user_id` (which doesn't exist on this table) and
        // silently failed, leaving the exercise — and any subsequent set logs
        // — out of the DB entirely. Fixing the column name + the user-id key
        // makes the insert actually pass.
        const inferredType =
          (exercise as unknown as { measurementType?: string }).measurementType
          ?? resolveMeasurementType(undefined, exercise.name);
        const { data: inserted, error: insertErr } = await supabase
          .from("exercises")
          .insert({
            name: exercise.name,
            muscle_group: exercise.muscleGroups[0] ?? "",
            measurement_type: inferredType,
            equipment: exercise.equipment,
            instructions: exercise.instructions,
            is_custom: true,
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
            .insert({
              name: exercise.name,
              created_by_user_id: user?.id ?? null,
              is_custom: true,
            })
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
      const [prevSets, prMap] = await Promise.all([
        fetchPreviousPerformance(exerciseUuid, activeWorkout.id),
        fetchPRsForExercises(supabase, [exerciseUuid]),
      ]);
      const pr = prMap.get(exerciseUuid);
      const mType = resolveMeasurementType(
        (exercise as unknown as { measurementType?: unknown }).measurementType,
        exercise.name,
      );
      setExercises((prev) => [
        ...prev,
        {
          weId: we.id,
          exerciseId: exerciseUuid,
          name: exercise.name,
          muscleGroups: exercise.muscleGroups,
          measurementType: mType,
          sets: [],
          previousSets: prevSets,
          personalRecord: pr ? { weight: pr.weight, reps: pr.reps, estimated1rm: pr.estimated1rm } : undefined,
        },
      ]);
    },
    [activeWorkout, exercises.length, supabase]
  );

  const removeExercise = useCallback(
    async (weId: string) => {
      if (!activeWorkout) return;
      if (weId.startsWith("temp-")) return;
      await supabase.from("workout_exercises").delete().eq("id", weId);
      setExercises((prev) => prev.filter((e) => e.weId !== weId));
    },
    [activeWorkout, supabase]
  );

  const addSet = useCallback((weId: string) => {
    setExercises((prev) =>
      prev.map((e) => {
        if (e.weId !== weId) return e;
        // Pre-fill from the same slot of the previous session
        const prevSlot = e.previousSets[e.sets.length];
        return {
          ...e,
          sets: [
            ...e.sets,
            {
              reps: prevSlot?.reps ?? "",
              weightKg: prevSlot?.weightKg ?? "",
              duration: "",
              distance: "",
              setType: "normal" as SetType,
              isPr: false,
              isSaved: false,
            },
          ],
        };
      })
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
      if (weId.startsWith("temp-")) return; // DB not ready yet — background init still running
      // Read from ref so this callback's identity stays stable across keystrokes
      const exercise = exercisesRef.current.find((e) => e.weId === weId);
      if (!exercise) return;
      const set = exercise.sets[idx];
      if (!set) return;

      const isCardio = exercise.measurementType === "cardio";
      const durationMins = parseFloat(set.duration) || null;
      const distanceKm = parseFloat(set.distance) || null;
      const reps = isCardio ? null : (parseInt(set.reps) || null);
      const weightKg = isCardio ? null : (parseFloat(set.weightKg) >= 0 ? parseFloat(set.weightKg) : null);
      const dbReps = isCardio ? durationMins : reps;
      const dbWeight = isCardio ? distanceKm : weightKg;

      // Determine the final ID synchronously so the UI lands in its
      // terminal state on the very first render after the tap.
      const isNewSet = !set.id;
      const orderIndex = exercise.sets.filter((s) => s.isSaved).length;
      const generatedId = typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const savedSetId = set.id ?? generatedId;

      // ── Optimistic flip — instant ✓ on the row, with the final ID
      //    persisted so subsequent saves/deletes route correctly even
      //    while the background writes are still in-flight.
      setExercises((prev) =>
        prev.map((e) => {
          if (e.weId !== weId) return e;
          const sets = [...e.sets];
          const existing = sets[idx];
          if (!existing) return e;
          sets[idx] = { ...existing, id: savedSetId, isSaved: true };
          return { ...e, sets };
        })
      );

      // ── Background: DB write + PR check. We don't await this from the
      //    caller, so the save tap returns immediately and rest-timer /
      //    next-set focus aren't gated on Supabase round-trips.
      void (async () => {
        try {
          if (!isNewSet) {
            const updateData = { reps: dbReps, weight: dbWeight, is_completed: true };
            try {
              const { error } = await supabase
                .from("workout_sets")
                .update(updateData)
                .eq("id", savedSetId);
              if (error) throw error;
            } catch {
              await queueMutation("upsertSet", { setId: savedSetId, data: updateData });
            }
          } else {
            const insertData = {
              id: savedSetId,
              workout_exercise_id: weId,
              reps: dbReps,
              weight: dbWeight,
              set_type: set.setType,
              rpe: set.rpe ?? null,
              is_pr: false,
              is_completed: true,
              order_index: orderIndex,
            };
            try {
              const { error } = await supabase.from("workout_sets").insert(insertData);
              if (error) throw error;
            } catch {
              await queueMutation("upsertSet", { data: insertData });
            }
          }

          // PR detection only matters for weight×reps lifts
          if (!reps || !weightKg || weightKg <= 0) return;

          const { data: prevSets } = await supabase
            .from("workout_sets")
            .select("weight, reps, workout_exercises!inner(exercise_id)")
            .eq("workout_exercises.exercise_id", exercise.exerciseId)
            .not("id", "eq", savedSetId);
          if (!prevSets || prevSets.length === 0) return;

          const prevMax = Math.max(
            0,
            ...prevSets.map(
              (s: Record<string, unknown>) =>
                ((s.weight as number) ?? 0) *
                (1 + ((s.reps as number) ?? 0) / 30)
            )
          );
          const current1RM = weightKg * (1 + reps / 30);
          if (current1RM <= prevMax) return;

          // PR! Persist + flip UI badge.
          await supabase.from("workout_sets").update({ is_pr: true }).eq("id", savedSetId);
          if (user) {
            await supabase.from("personal_records").upsert(
              {
                user_id: user.id,
                exercise_id: exercise.exerciseId,
                weight: weightKg,
                reps,
                estimated_1rm: parseFloat((weightKg * (1 + reps / 30)).toFixed(1)),
                achieved_at: new Date().toISOString(),
              },
              { onConflict: "user_id,exercise_id" }
            );
          }
          setExercises((prev) =>
            prev.map((e) => {
              if (e.weId !== weId) return e;
              const sets = [...e.sets];
              const setIdx = sets.findIndex((s) => s.id === savedSetId);
              if (setIdx < 0) return e;
              sets[setIdx] = { ...sets[setIdx]!, isPr: true };
              return { ...e, sets };
            })
          );
          setPrExerciseName(exercise.name);
          setShowPrBanner(true);
          setTimeout(() => setShowPrBanner(false), 3500);
        } catch (err) {
          console.error("[saveSet] background task failed:", err);
        }
      })();
    },
    [activeWorkout, supabase, user]
  );

  const deleteSet = useCallback(
    async (weId: string, setId: string) => {
      if (weId.startsWith("temp-")) return;
      try {
        const { error } = await supabase.from("workout_sets").delete().eq("id", setId);
        if (error) throw error;
      } catch {
        await queueMutation("deleteSet", { setId });
      }
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
