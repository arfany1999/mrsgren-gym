"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { TopBar } from "@/components/layout/TopBar/TopBar";
import { Button } from "@/components/ui/Button/Button";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import { ExercisePicker } from "@/components/workout/ExercisePicker/ExercisePicker";
import type { Exercise } from "@/types/api";
import styles from "./page.module.css";

interface DraftExercise {
  reId: string | null; // null for newly added
  exerciseId: string;
  name: string;
  muscleGroups: string[];
  sets: number;
  orderIndex: number;
}

export default function EditRoutinePage() {
  const { id } = useParams<{ id: string }>();
  const { supabase, user } = useAuth();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [exercises, setExercises] = useState<DraftExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from("routines")
        .select("*, routine_exercises(*, exercises(*))")
        .eq("id", id)
        .single();
      if (err || !data) { router.replace("/routines"); return; }

      setTitle((data.title as string) ?? (data.name as string) ?? "");
      const res = ((data.routine_exercises as Record<string, unknown>[]) ?? [])
        .slice()
        .sort((a, b) => ((a.order_index ?? a.order ?? 0) as number) - ((b.order_index ?? b.order ?? 0) as number));

      setExercises(res.map((re, i) => {
        const ex = (re.exercises as Record<string, unknown>) ?? {};
        return {
          reId: re.id as string,
          exerciseId: re.exercise_id as string,
          name: ex.name as string,
          muscleGroups: (ex.muscle_groups as string[]) ?? [],
          sets: (re.sets as number) ?? 3,
          orderIndex: i,
        };
      }));
    } finally {
      setLoading(false);
    }
  }, [id, supabase, router]);

  useEffect(() => { load(); }, [load]);

  async function handleAddExercise(exercise: Exercise) {
    setError("");
    try {
      let exerciseId = "";
      const { data: existing } = await supabase
        .from("exercises")
        .select("id")
        .ilike("name", exercise.name)
        .limit(1)
        .maybeSingle();

      if (existing?.id) {
        exerciseId = existing.id;
      } else {
        const { data: inserted, error: insertErr } = await supabase
          .from("exercises")
          .insert({ name: exercise.name, muscle_groups: exercise.muscleGroups, equipment: exercise.equipment })
          .select("id")
          .single();
        if (!inserted) {
          // Fallback without muscle_groups
          const { data: fb, error: fbErr } = await supabase
            .from("exercises")
            .insert({ name: exercise.name })
            .select("id")
            .single();
          if (fbErr || !fb) throw new Error((fbErr as { message?: string } | null)?.message ?? "Cannot add exercise");
          exerciseId = fb.id;
        } else {
          if (insertErr) throw new Error((insertErr as { message?: string } | null)?.message ?? "Insert failed");
          exerciseId = inserted.id;
        }
      }

      if (exercises.some((e) => e.exerciseId === exerciseId)) return;
      setExercises((prev) => [
        ...prev,
        {
          reId: null,
          exerciseId,
          name: exercise.name,
          muscleGroups: exercise.muscleGroups ?? [],
          sets: 3,
          orderIndex: prev.length,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add exercise");
    }
  }

  function removeExercise(idx: number) {
    setExercises((prev) =>
      prev.filter((_, i) => i !== idx).map((e, i) => ({ ...e, orderIndex: i }))
    );
  }

  function updateSets(idx: number, delta: number) {
    setExercises((prev) =>
      prev.map((e, i) => i === idx ? { ...e, sets: Math.max(1, e.sets + delta) } : e)
    );
  }

  async function handleSave() {
    if (!title.trim()) { setError("Routine name is required"); return; }
    setSaving(true);
    setError("");
    try {
      // Update routine title
      await supabase
        .from("routines")
        .update({ name: title.trim() })
        .eq("id", id);

      // Delete all existing routine_exercises and re-insert
      await supabase.from("routine_exercises").delete().eq("routine_id", id);

      if (exercises.length > 0) {
        const { error: exErr } = await supabase.from("routine_exercises").insert(
          exercises.map((ex, i) => ({
            routine_id: id,
            exercise_id: ex.exerciseId,
            order_index: i,
            sets: ex.sets,
          }))
        );
        if (exErr) throw new Error(exErr.message);
      }

      router.replace(`/routines/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className={styles.loading}><Spinner size={32} /></div>;

  return (
    <div className={styles.page}>
      <TopBar
        title="Edit Routine"
        showBack
        rightAction={
          <button type="button" className={styles.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        }
      />

      <div className={styles.content}>
        {/* Title */}
        <div className={styles.nameWrap}>
          <input
            className={styles.nameInput}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Routine name"
          />
        </div>

        {error && <p className={styles.error}>{error}</p>}

        {/* Exercise list */}
        <div className={styles.exList}>
          {exercises.map((ex, idx) => (
            <div key={`${ex.exerciseId}-${idx}`} className={styles.exRow}>
              {/* Drag handle (visual only) */}
              <div className={styles.dragHandle}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="9" cy="6" r="1.5" fill="var(--text-tertiary)" />
                  <circle cx="15" cy="6" r="1.5" fill="var(--text-tertiary)" />
                  <circle cx="9" cy="12" r="1.5" fill="var(--text-tertiary)" />
                  <circle cx="15" cy="12" r="1.5" fill="var(--text-tertiary)" />
                  <circle cx="9" cy="18" r="1.5" fill="var(--text-tertiary)" />
                  <circle cx="15" cy="18" r="1.5" fill="var(--text-tertiary)" />
                </svg>
              </div>

              <div className={styles.exInfo}>
                <p className={styles.exName}>{ex.name}</p>
                {ex.muscleGroups.length > 0 && (
                  <p className={styles.exMuscles}>{ex.muscleGroups.join(", ")}</p>
                )}
              </div>

              {/* Sets stepper */}
              <div className={styles.setsStepper}>
                <button
                  type="button"
                  className={styles.stepBtn}
                  onClick={() => updateSets(idx, -1)}
                  aria-label="Decrease sets"
                >−</button>
                <span className={styles.setsVal}>{ex.sets} sets</span>
                <button
                  type="button"
                  className={styles.stepBtn}
                  onClick={() => updateSets(idx, 1)}
                  aria-label="Increase sets"
                >+</button>
              </div>

              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => removeExercise(idx)}
                aria-label="Remove exercise"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="var(--accent-red)" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          ))}

          <button
            type="button"
            className={styles.addExBtn}
            onClick={() => setPickerOpen(true)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            Add Exercise
          </button>
        </div>

        <Button fullWidth size="lg" onClick={handleSave} loading={saving}>
          Save Routine
        </Button>
      </div>

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleAddExercise}
      />
    </div>
  );
}
