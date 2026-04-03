"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { TopBar } from "@/components/layout/TopBar/TopBar";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import { fetchExercises, searchExercises } from "@/lib/exercisedb";
import type { Exercise } from "@/types/api";
import styles from "./page.module.css";

interface SetDraft {
  kg: string;
  reps: string;
}

interface DraftExercise {
  reId: string | null;
  exerciseId: string;
  name: string;
  muscleGroups: string[];
  sets: SetDraft[];
  orderIndex: number;
}

const DEFAULT_SET: SetDraft = { kg: "", reps: "" };

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
  const libSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadLibrary = useCallback(async (q: string) => {
    setLibLoading(true);
    try {
      const result = q
        ? await searchExercises({ q, limit: 50 })
        : await fetchExercises({ limit: 50, offset: 0 });
      setLibraryExercises(result.exercises);
    } catch {
      setLibraryExercises([]);
    } finally {
      setLibLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLibrary("");
  }, [loadLibrary]);

  useEffect(() => {
    if (libSearchTimer.current) clearTimeout(libSearchTimer.current);
    if (!libQuery) { loadLibrary(""); return; }
    libSearchTimer.current = setTimeout(() => loadLibrary(libQuery), 300);
    return () => { if (libSearchTimer.current) clearTimeout(libSearchTimer.current); };
  }, [libQuery, loadLibrary]);

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
        const setsCount = (re.sets as number) ?? 3;
        const setsConfig = Array.isArray(re.sets_config) ? re.sets_config : null;
        const sets: SetDraft[] = setsConfig
          ? (setsConfig as Array<{ weightKg?: number; reps?: number }>).map((s) => ({
              kg: s.weightKg != null ? String(s.weightKg) : "",
              reps: s.reps != null ? String(s.reps) : "",
            }))
          : Array.from({ length: setsCount }, () => ({ ...DEFAULT_SET }));
        return {
          reId: re.id as string,
          exerciseId: re.exercise_id as string,
          name: ex.name as string,
          muscleGroups: (ex.muscle_groups as string[]) ?? [],
          sets,
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
        const { data: inserted } = await supabase
          .from("exercises")
          .insert({ name: exercise.name, muscle_groups: exercise.muscleGroups })
          .select("id")
          .single();
        if (!inserted) {
          const { data: fb } = await supabase
            .from("exercises")
            .insert({ name: exercise.name })
            .select("id")
            .single();
          if (!fb) { setError("Could not add exercise"); return; }
          exerciseId = fb.id;
        } else {
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
          sets: [{ ...DEFAULT_SET }, { ...DEFAULT_SET }, { ...DEFAULT_SET }],
          orderIndex: prev.length,
        },
      ]);
    } catch {
      setError("Failed to add exercise");
    }
  }

  function removeExercise(idx: number) {
    setExercises((prev) =>
      prev.filter((_, i) => i !== idx).map((e, i) => ({ ...e, orderIndex: i }))
    );
  }

  function addSet(exIdx: number) {
    setExercises((prev) =>
      prev.map((e, i) => i === exIdx ? { ...e, sets: [...e.sets, { ...DEFAULT_SET }] } : e)
    );
  }

  function removeSet(exIdx: number, setIdx: number) {
    setExercises((prev) =>
      prev.map((e, i) => i === exIdx
        ? { ...e, sets: e.sets.filter((_, si) => si !== setIdx) }
        : e
      )
    );
  }

  function updateSet(exIdx: number, setIdx: number, field: "kg" | "reps", value: string) {
    setExercises((prev) =>
      prev.map((e, i) => i === exIdx
        ? { ...e, sets: e.sets.map((s, si) => si === setIdx ? { ...s, [field]: value } : s) }
        : e
      )
    );
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
          sets: ex.sets.length,
          sets_config: ex.sets.map((s) => ({
            setType: "normal",
            reps: s.reps ? parseInt(s.reps) : null,
            weightKg: s.kg ? parseFloat(s.kg) : null,
          })),
        }));
        const { error: exErr } = await supabase.from("routine_exercises").insert(rows);
        if (exErr) {
          // Fallback: try without sets_config
          const rowsFallback = rows.map(({ sets_config: _sc, ...rest }) => rest);
          const { error: fbErr } = await supabase.from("routine_exercises").insert(rowsFallback);
          if (fbErr) throw new Error(fbErr.message);
        }
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
            {saving ? "Saving…" : "Update Routine"}
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

          {/* Exercise blocks */}
          {exercises.map((ex, exIdx) => (
            <div key={`${ex.exerciseId}-${exIdx}`} className={styles.exBlock}>
              <div className={styles.exHeader}>
                <div className={styles.dragHandle}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle cx="9" cy="5" r="1.5" fill="var(--text-tertiary)" />
                    <circle cx="15" cy="5" r="1.5" fill="var(--text-tertiary)" />
                    <circle cx="9" cy="12" r="1.5" fill="var(--text-tertiary)" />
                    <circle cx="15" cy="12" r="1.5" fill="var(--text-tertiary)" />
                    <circle cx="9" cy="19" r="1.5" fill="var(--text-tertiary)" />
                    <circle cx="15" cy="19" r="1.5" fill="var(--text-tertiary)" />
                  </svg>
                </div>
                <div className={styles.exIconCircle}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="9" width="4" height="6" rx="1" stroke="#555" strokeWidth="1.5"/>
                    <rect x="17" y="9" width="4" height="6" rx="1" stroke="#555" strokeWidth="1.5"/>
                    <rect x="7" y="10.5" width="10" height="3" rx="1.5" stroke="#555" strokeWidth="1.5"/>
                  </svg>
                </div>
                <p className={styles.exName}>{ex.name}</p>
                <button type="button" className={styles.exMenuBtn} onClick={() => removeExercise(exIdx)} aria-label="Remove">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="var(--accent-red)" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              {/* Sets table */}
              <div className={styles.setsTable}>
                <div className={styles.setsHeader}>
                  <span>SET</span>
                  <span>KG</span>
                  <span>REPS</span>
                  <span />
                </div>
                {ex.sets.map((set, setIdx) => (
                  <div key={setIdx} className={styles.setRow}>
                    <span className={styles.setNum}>{setIdx + 1}</span>
                    <input
                      className={styles.setInput}
                      type="number"
                      value={set.kg}
                      onChange={(e) => updateSet(exIdx, setIdx, "kg", e.target.value)}
                      placeholder="—"
                    />
                    <input
                      className={styles.setInput}
                      type="number"
                      value={set.reps}
                      onChange={(e) => updateSet(exIdx, setIdx, "reps", e.target.value)}
                      placeholder="—"
                    />
                    <button
                      type="button"
                      className={styles.removeSetBtn}
                      onClick={() => removeSet(exIdx, setIdx)}
                      aria-label="Remove set"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M18 6L6 18M6 6l12 12" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>

              <button type="button" className={styles.addSetBtn} onClick={() => addSet(exIdx)}>
                + Add Set
              </button>
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
              onChange={(e) => setLibQuery(e.target.value)}
            />
          </div>

          <div className={styles.libList}>
            {libLoading ? (
              <div className={styles.libLoading}><Spinner size={20} /></div>
            ) : (
              libraryExercises.map((ex) => (
                <button
                  key={ex.id}
                  type="button"
                  className={styles.libItem}
                  onClick={() => handleAddFromLibrary(ex)}
                >
                  <div className={styles.libIcon}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="9" width="4" height="6" rx="1" stroke="#555" strokeWidth="1.5"/>
                      <rect x="17" y="9" width="4" height="6" rx="1" stroke="#555" strokeWidth="1.5"/>
                      <rect x="7" y="10.5" width="10" height="3" rx="1.5" stroke="#555" strokeWidth="1.5"/>
                    </svg>
                  </div>
                  <div className={styles.libInfo}>
                    <p className={styles.libName}>{ex.name}</p>
                    {ex.muscleGroups.length > 0 && (
                      <p className={styles.libMuscle}>{ex.muscleGroups[0]?.charAt(0).toUpperCase()}{ex.muscleGroups[0]?.slice(1)}</p>
                    )}
                  </div>
                  <div className={styles.libAdd}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" fill="var(--accent)" />
                      <path d="M12 7v10M7 12h10" stroke="#000" strokeWidth="2" strokeLinecap="round" />
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
