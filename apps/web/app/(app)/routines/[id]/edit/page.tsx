"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { TopBar } from "@/components/layout/TopBar/TopBar";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import { MuscleMap } from "@/components/ui/MuscleMap/MuscleMap";
import { fetchExercises, searchExercises } from "@/lib/exercisedb";
import type { Exercise } from "@/types/api";
import styles from "./page.module.css";

const MUSCLE_CHIPS = [
  { label: "All",        bodyPart: "" },
  { label: "Chest",      bodyPart: "chest" },
  { label: "Back",       bodyPart: "back" },
  { label: "Shoulders",  bodyPart: "shoulders" },
  { label: "Upper Arms", bodyPart: "upper arms" },
  { label: "Lower Arms", bodyPart: "lower arms" },
  { label: "Upper Legs", bodyPart: "upper legs" },
  { label: "Lower Legs", bodyPart: "lower legs" },
  { label: "Waist",      bodyPart: "waist" },
  { label: "Cardio",     bodyPart: "cardio" },
];

interface DraftExercise {
  reId: string | null;
  exerciseId: string;
  name: string;
  sets: string;
  reps: string;
  weight: string;
  orderIndex: number;
}

export default function EditRoutinePage() {
  const { id } = useParams<{ id: string }>();
  const { supabase } = useAuth();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [exercises, setExercises] = useState<DraftExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Library panel
  const [libraryExercises, setLibraryExercises] = useState<Exercise[]>([]);
  const [libLoading, setLibLoading] = useState(false);
  const [libQuery, setLibQuery] = useState("");
  const [libMuscle, setLibMuscle] = useState("");
  const libSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadLibrary = useCallback(async (q: string, bodyPart: string) => {
    setLibLoading(true);
    try {
      const searchTerm = q || bodyPart;
      const result = searchTerm
        ? await searchExercises({ q: searchTerm, limit: 80 })
        : await fetchExercises({ limit: 80, offset: 0 });
      setLibraryExercises(result.exercises);
    } catch {
      setLibraryExercises([]);
    } finally {
      setLibLoading(false);
    }
  }, []);

  useEffect(() => { loadLibrary("", ""); }, [loadLibrary]);

  useEffect(() => {
    if (libSearchTimer.current) clearTimeout(libSearchTimer.current);
    if (!libQuery) { loadLibrary("", libMuscle); return; }
    libSearchTimer.current = setTimeout(() => loadLibrary(libQuery, libMuscle), 300);
    return () => { if (libSearchTimer.current) clearTimeout(libSearchTimer.current); };
  }, [libQuery, libMuscle, loadLibrary]);

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
        .sort((a, b) => ((a.order_index ?? 0) as number) - ((b.order_index ?? 0) as number));

      setExercises(res.map((re, i) => {
        const ex = (re.exercises as Record<string, unknown>) ?? {};
        return {
          reId: re.id as string,
          exerciseId: re.exercise_id as string,
          name: (ex.name as string) ?? "",
          sets: String((re.sets as number) ?? 4),
          reps: String((re.reps as number) ?? 12),
          weight: (re.weight as number) != null ? String(re.weight) : "",
          orderIndex: i,
        };
      }));
    } finally {
      setLoading(false);
    }
  }, [id, supabase, router]);

  useEffect(() => { load(); }, [load]);

  async function handleAddFromLibrary(exercise: Exercise) {
    setError("");
    if (exercises.some(e => e.name.toLowerCase() === exercise.name.toLowerCase())) return;
    try {
      let exerciseId = "";
      const { data: existing } = await supabase
        .from("exercises").select("id").ilike("name", exercise.name).limit(1).maybeSingle();
      if (existing?.id) {
        exerciseId = existing.id;
      } else {
        const { data: ins } = await supabase
          .from("exercises").insert({ name: exercise.name, muscle_group: exercise.muscleGroups }).select("id").single();
        if (!ins) { setError("Could not add exercise"); return; }
        exerciseId = ins.id;
      }
      setExercises(prev => [...prev, {
        reId: null, exerciseId, name: exercise.name,
        sets: "4", reps: "12", weight: "",
        orderIndex: prev.length,
      }]);
    } catch {
      setError("Failed to add exercise");
    }
  }

  function removeExercise(idx: number) {
    setExercises(prev => prev.filter((_, i) => i !== idx).map((e, i) => ({ ...e, orderIndex: i })));
  }

  function updateField(idx: number, field: "sets" | "reps" | "weight", value: string) {
    setExercises(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  }

  async function handleSave() {
    if (!title.trim()) { setError("Routine name is required"); return; }
    setSaving(true);
    setError("");
    try {
      await supabase.from("routines").update({ name: title.trim() }).eq("id", id);
      await supabase.from("routine_exercises").delete().eq("routine_id", id);

      if (exercises.length > 0) {
        const rows = exercises.map((ex, i) => ({
          routine_id: id,
          exercise_id: ex.exerciseId,
          order_index: i,
          sets: parseInt(ex.sets) || 4,
          reps: parseInt(ex.reps) || 12,
          weight: ex.weight ? parseFloat(ex.weight) : null,
        }));
        await supabase.from("routine_exercises").insert(rows);
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

      <div className={styles.layout}>
        {/* Main area */}
        <div className={styles.main}>
          {/* Title */}
          <div className={styles.titleWrap}>
            <label className={styles.titleLabel}>Routine Title</label>
            <input
              className={styles.titleInput}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Routine name"
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          {exercises.length === 0 && (
            <p className={styles.emptyHint}>Add exercises from the library →</p>
          )}

          {/* Exercise blocks */}
          {exercises.map((ex, exIdx) => (
            <div key={`${ex.exerciseId}-${exIdx}`} className={styles.exBlock}>
              <div className={styles.exHeader}>
                <div className={styles.exIconCircle}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="9" width="4" height="6" rx="1" stroke="#555" strokeWidth="1.5"/>
                    <rect x="17" y="9" width="4" height="6" rx="1" stroke="#555" strokeWidth="1.5"/>
                    <rect x="7" y="10.5" width="10" height="3" rx="1.5" stroke="#555" strokeWidth="1.5"/>
                  </svg>
                </div>
                <p className={styles.exName}>{ex.name}</p>
                <button type="button" className={styles.exRemoveBtn} onClick={() => removeExercise(exIdx)} aria-label="Remove">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="var(--accent-red)" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>

              <div className={styles.exFields}>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Sets</label>
                  <input
                    className={styles.fieldInput}
                    type="number"
                    min="1"
                    value={ex.sets}
                    onChange={e => updateField(exIdx, "sets", e.target.value)}
                    placeholder="4"
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Reps</label>
                  <input
                    className={styles.fieldInput}
                    type="number"
                    min="1"
                    value={ex.reps}
                    onChange={e => updateField(exIdx, "reps", e.target.value)}
                    placeholder="12"
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Weight (kg)</label>
                  <input
                    className={styles.fieldInput}
                    type="number"
                    min="0"
                    value={ex.weight}
                    onChange={e => updateField(exIdx, "weight", e.target.value)}
                    placeholder="optional"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Library panel */}
        <div className={styles.library}>
          <div className={styles.libraryHeader}>
            <span className={styles.libraryTitle}>Library</span>
          </div>
          <div className={styles.libSearch}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="8" stroke="var(--text-tertiary)" strokeWidth="2"/>
              <path d="M21 21l-4.35-4.35" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <input
              className={styles.libSearchInput}
              placeholder="Search Exercises"
              value={libQuery}
              onChange={e => setLibQuery(e.target.value)}
            />
          </div>
          <div className={styles.libChips}>
            {MUSCLE_CHIPS.map((chip) => (
              <button
                key={chip.bodyPart}
                type="button"
                className={[styles.libChip, libMuscle === chip.bodyPart ? styles.libChipActive : ""].join(" ")}
                onClick={() => { setLibMuscle(chip.bodyPart); setLibQuery(""); }}
              >
                {chip.label}
              </button>
            ))}
          </div>
          <div className={styles.libList}>
            {libLoading ? (
              <div className={styles.libLoading}><Spinner size={20} /></div>
            ) : (
              libraryExercises.map(ex => (
                <button key={ex.id} type="button" className={styles.libItem} onClick={() => handleAddFromLibrary(ex)}>
                  <div className={styles.libIcon}>
                    <MuscleMap muscles={ex.muscleGroups} variant="compact" />
                  </div>
                  <div className={styles.libInfo}>
                    <p className={styles.libName}>{ex.name}</p>
                    {ex.muscleGroups.length > 0 && (
                      <p className={styles.libMuscle}>{ex.muscleGroups[0]?.charAt(0).toUpperCase()}{ex.muscleGroups[0]?.slice(1)}</p>
                    )}
                  </div>
                  <div className={styles.libAdd}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" fill="var(--accent)"/>
                      <path d="M12 7v10M7 12h10" stroke="#000" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
