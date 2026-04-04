"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { TopBar } from "@/components/layout/TopBar/TopBar";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import { ExerciseAnimation } from "@/components/ui/ExerciseAnimation/ExerciseAnimation";
import { browseExercises, searchFreeExercises } from "@/lib/freeExerciseDb";
import type { FreeExercise } from "@/lib/freeExerciseDb";
import styles from "./page.module.css";

const MUSCLE_CHIPS = [
  { label: "All",        bodyPart: "",             emoji: "💪" },
  { label: "Chest",      bodyPart: "chest",        emoji: "🫀" },
  { label: "Back",       bodyPart: "lats",         emoji: "🔙" },
  { label: "Shoulders",  bodyPart: "shoulders",    emoji: "🏋️" },
  { label: "Biceps",     bodyPart: "biceps",       emoji: "💪" },
  { label: "Triceps",    bodyPart: "triceps",      emoji: "🦾" },
  { label: "Abs",        bodyPart: "abdominals",   emoji: "🎯" },
  { label: "Quads",      bodyPart: "quadriceps",   emoji: "🦵" },
  { label: "Hamstrings", bodyPart: "hamstrings",   emoji: "🦿" },
  { label: "Glutes",     bodyPart: "glutes",       emoji: "🍑" },
  { label: "Calves",     bodyPart: "calves",       emoji: "🦵" },
];

interface DraftSet {
  reps: string;
  weight: string;
}

interface DraftExercise {
  reId: string | null;
  exerciseId: string;
  name: string;
  sets: DraftSet[];
  orderIndex: number;
}

function defaultSet(): DraftSet {
  return { reps: "12", weight: "" };
}

function defaultSets(count = 4): DraftSet[] {
  return Array.from({ length: count }, () => defaultSet());
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

  // Bottom sheet state
  const [sheetOpen, setSheetOpen] = useState(false);

  // Library state
  const [libraryExercises, setLibraryExercises] = useState<FreeExercise[]>([]);
  const [libLoading, setLibLoading] = useState(false);
  const [libQuery, setLibQuery] = useState("");
  const [libMuscle, setLibMuscle] = useState("");
  const libSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refs for scrolling to last exercise
  const exerciseRefs = useRef<(HTMLDivElement | null)[]>([]);

  const loadLibrary = useCallback(async (q: string, bodyPart: string) => {
    setLibLoading(true);
    try {
      if (q) {
        const results = await searchFreeExercises(q);
        setLibraryExercises(results);
      } else {
        const { exercises } = await browseExercises({ limit: 80, offset: 0, muscle: bodyPart || undefined });
        setLibraryExercises(exercises);
      }
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

      const mapped = res.map((re, i) => {
        const ex = (re.exercises as Record<string, unknown>) ?? {};

        // Use sets_config JSONB if present, otherwise build from sets/reps/weight
        let sets: DraftSet[];
        const setsConfig = re.sets_config as Array<{ reps?: number | null; weight?: number | null }> | null;
        if (Array.isArray(setsConfig) && setsConfig.length > 0) {
          sets = setsConfig.map(s => ({
            reps: s.reps != null ? String(s.reps) : "12",
            weight: s.weight != null ? String(s.weight) : "",
          }));
        } else {
          const count = (re.sets as number) ?? 4;
          const reps = (re.reps as number) ?? 12;
          const weight = (re.weight as number) ?? null;
          sets = Array.from({ length: count }, () => ({
            reps: String(reps),
            weight: weight != null ? String(weight) : "",
          }));
        }

        return {
          reId: re.id as string,
          exerciseId: re.exercise_id as string,
          name: (ex.name as string) ?? "",
          sets,
          orderIndex: i,
        };
      });

      setExercises(mapped);
      if (mapped.length === 0) setSheetOpen(true);
    } finally {
      setLoading(false);
    }
  }, [id, supabase, router]);

  useEffect(() => { load(); }, [load]);

  function openSheet() {
    setLibQuery("");
    setSheetOpen(true);
  }

  function closeSheet() {
    setSheetOpen(false);
  }

  async function handleAddFromLibrary(exercise: FreeExercise) {
    setError("");
    if (exercises.some(e => e.name.toLowerCase() === exercise.name.toLowerCase())) {
      closeSheet();
      return;
    }
    try {
      let exerciseId = "";
      const { data: existing } = await supabase
        .from("exercises").select("id").ilike("name", exercise.name).limit(1).maybeSingle();
      if (existing?.id) {
        exerciseId = existing.id;
      } else {
        const { data: ins } = await supabase
          .from("exercises").insert({ name: exercise.name, muscle_group: exercise.primaryMuscles[0] ?? "" }).select("id").single();
        if (!ins) { setError("Could not add exercise"); return; }
        exerciseId = ins.id;
      }

      setExercises(prev => [...prev, {
        reId: null,
        exerciseId,
        name: exercise.name,
        sets: defaultSets(4),
        orderIndex: prev.length,
      }]);

      closeSheet();

      setTimeout(() => {
        const lastRef = exerciseRefs.current[exerciseRefs.current.length - 1];
        if (lastRef) {
          lastRef.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 120);

    } catch {
      setError("Failed to add exercise");
    }
  }

  function removeExercise(idx: number) {
    setExercises(prev => prev.filter((_, i) => i !== idx).map((e, i) => ({ ...e, orderIndex: i })));
  }

  function addSet(exIdx: number) {
    setExercises(prev => prev.map((ex, i) => {
      if (i !== exIdx) return ex;
      // Copy last set's values as default for new set
      const last = ex.sets[ex.sets.length - 1];
      return { ...ex, sets: [...ex.sets, { reps: last?.reps ?? "12", weight: last?.weight ?? "" }] };
    }));
  }

  function removeSet(exIdx: number, setIdx: number) {
    setExercises(prev => prev.map((ex, i) => {
      if (i !== exIdx) return ex;
      if (ex.sets.length <= 1) return ex; // keep at least 1 set
      return { ...ex, sets: ex.sets.filter((_, si) => si !== setIdx) };
    }));
  }

  function updateSet(exIdx: number, setIdx: number, field: "reps" | "weight", value: string) {
    setExercises(prev => prev.map((ex, i) => {
      if (i !== exIdx) return ex;
      return {
        ...ex,
        sets: ex.sets.map((s, si) => si === setIdx ? { ...s, [field]: value } : s),
      };
    }));
  }

  async function handleSave() {
    if (!title.trim()) { setError("Routine name is required"); return; }
    setSaving(true);
    setError("");
    try {
      await supabase.from("routines").update({ name: title.trim() }).eq("id", id);
      await supabase.from("routine_exercises").delete().eq("routine_id", id);

      if (exercises.length > 0) {
        const rows = exercises.map((ex, i) => {
          const setsConfig = ex.sets.map(s => ({
            reps: parseInt(s.reps) || null,
            weight: s.weight ? parseFloat(s.weight) : null,
          }));
          // Also store legacy flat fields for backward compat
          const firstSet = setsConfig[0];
          return {
            routine_id: id,
            exercise_id: ex.exerciseId,
            order_index: i,
            sets: ex.sets.length,
            reps: firstSet?.reps ?? 12,
            weight: firstSet?.weight ?? null,
            sets_config: setsConfig,
          };
        });
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

      <div className={styles.main}>
        {/* Title */}
        <div className={styles.titleWrap}>
          <label className={styles.titleLabel}>Routine Title</label>
          <input
            className={styles.titleInput}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Push Day, Leg Day…"
          />
        </div>

        {error && <p className={styles.error}>{error}</p>}

        {/* Exercise blocks */}
        {exercises.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="9" width="4" height="6" rx="1" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5"/>
                <rect x="17" y="9" width="4" height="6" rx="1" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5"/>
                <rect x="7" y="10.5" width="10" height="3" rx="1.5" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5"/>
              </svg>
            </div>
            <p className={styles.emptyTitle}>No exercises yet</p>
            <p className={styles.emptySub}>Tap below to add your first exercise</p>
          </div>
        ) : (
          exercises.map((ex, exIdx) => (
            <div
              key={`${ex.exerciseId}-${exIdx}`}
              className={styles.exBlock}
              ref={el => { exerciseRefs.current[exIdx] = el; }}
            >
              {/* Exercise header */}
              <div className={styles.exHeader}>
                <div className={styles.exIconCircle}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="9" width="4" height="6" rx="1" stroke="#555" strokeWidth="1.5"/>
                    <rect x="17" y="9" width="4" height="6" rx="1" stroke="#555" strokeWidth="1.5"/>
                    <rect x="7" y="10.5" width="10" height="3" rx="1.5" stroke="#555" strokeWidth="1.5"/>
                  </svg>
                </div>
                <p className={styles.exName}>{ex.name}</p>
                <button type="button" className={styles.exRemoveBtn} onClick={() => removeExercise(exIdx)} aria-label="Remove exercise">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="var(--accent-red)" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>

              {/* Sets table header */}
              <div className={styles.setsTableHead}>
                <span className={styles.setNumCol}>SET</span>
                <span className={styles.setRepsCol}>REPS</span>
                <span className={styles.setWeightCol}>KG</span>
                <span className={styles.setRemoveCol} />
              </div>

              {/* Individual set rows */}
              {ex.sets.map((s, setIdx) => (
                <div key={setIdx} className={styles.setRow}>
                  <span className={styles.setNumBadge}>{setIdx + 1}</span>
                  <input
                    className={styles.setInput}
                    type="number"
                    min="1"
                    inputMode="numeric"
                    value={s.reps}
                    onChange={e => updateSet(exIdx, setIdx, "reps", e.target.value)}
                    placeholder="12"
                  />
                  <input
                    className={styles.setInput}
                    type="number"
                    min="0"
                    step="0.5"
                    inputMode="decimal"
                    value={s.weight}
                    onChange={e => updateSet(exIdx, setIdx, "weight", e.target.value)}
                    placeholder="—"
                  />
                  <button
                    type="button"
                    className={styles.setRemoveBtn}
                    onClick={() => removeSet(exIdx, setIdx)}
                    disabled={ex.sets.length <= 1}
                    aria-label="Remove set"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M18 6L6 18M6 6l12 12" stroke={ex.sets.length <= 1 ? "rgba(255,255,255,0.15)" : "var(--accent-red)"} strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              ))}

              {/* Add set button */}
              <button type="button" className={styles.addSetBtn} onClick={() => addSet(exIdx)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5v14M5 12h14" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round"/>
                </svg>
                Add Set
              </button>
            </div>
          ))
        )}

        {/* Add Exercise button */}
        <button type="button" className={styles.addExBtn} onClick={openSheet}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" fill="var(--accent)" opacity="0.15"/>
            <path d="M12 7v10M7 12h10" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round"/>
          </svg>
          Add Exercise
        </button>
      </div>

      {/* ── Bottom Sheet Overlay ─────────────────────────────────── */}
      {sheetOpen && (
        <div className={styles.sheetBackdrop} onClick={closeSheet} />
      )}
      <div className={[styles.sheet, sheetOpen ? styles.sheetOpen : ""].join(" ")}>
        <div className={styles.sheetHandle} />

        <div className={styles.sheetHeader}>
          <span className={styles.sheetTitle}>Add Exercise</span>
          <button type="button" className={styles.sheetClose} onClick={closeSheet} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className={styles.sheetSearch}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="var(--text-tertiary)" strokeWidth="2"/>
            <path d="M21 21l-4.35-4.35" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input
            className={styles.sheetSearchInput}
            placeholder="Search exercises…"
            value={libQuery}
            onChange={e => setLibQuery(e.target.value)}
            autoComplete="off"
          />
          {libQuery && (
            <button type="button" className={styles.sheetSearchClear} onClick={() => setLibQuery("")}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>

        <div className={styles.chipGrid}>
          {MUSCLE_CHIPS.map((chip) => (
            <button
              key={chip.bodyPart}
              type="button"
              className={[styles.chip, libMuscle === chip.bodyPart ? styles.chipActive : ""].join(" ")}
              onClick={() => { setLibMuscle(chip.bodyPart); setLibQuery(""); }}
            >
              <span className={styles.chipEmoji}>{chip.emoji}</span>
              <span className={styles.chipLabel}>{chip.label}</span>
            </button>
          ))}
        </div>

        <div className={styles.sheetList}>
          {libLoading ? (
            <div className={styles.sheetLoading}><Spinner size={24} /></div>
          ) : libraryExercises.length === 0 ? (
            <p className={styles.sheetEmpty}>No exercises found</p>
          ) : (
            libraryExercises.map(ex => {
              const alreadyAdded = exercises.some(e => e.name.toLowerCase() === ex.name.toLowerCase());
              return (
                <button
                  key={ex.id}
                  type="button"
                  className={[styles.sheetItem, alreadyAdded ? styles.sheetItemAdded : ""].join(" ")}
                  onClick={() => !alreadyAdded && handleAddFromLibrary(ex)}
                  disabled={alreadyAdded}
                >
                  <div className={styles.sheetItemIcon}>
                    <ExerciseAnimation name={ex.name} muscles={ex.primaryMuscles} variant="thumb" />
                  </div>
                  <div className={styles.sheetItemInfo}>
                    <p className={styles.sheetItemName}>{ex.name}</p>
                    {ex.primaryMuscles.length > 0 && (
                      <p className={styles.sheetItemMuscle}>
                        {ex.primaryMuscles[0]?.charAt(0).toUpperCase()}{ex.primaryMuscles[0]?.slice(1)}
                      </p>
                    )}
                  </div>
                  <div className={styles.sheetItemAction}>
                    {alreadyAdded ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M5 13l4 4L19 7" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" fill="var(--accent)"/>
                        <path d="M12 7v10M7 12h10" stroke="#000" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
