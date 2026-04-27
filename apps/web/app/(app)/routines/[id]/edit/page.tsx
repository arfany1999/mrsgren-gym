"use client";

import { useEffect, useState, useCallback, useRef, useMemo, memo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { TopBar } from "@/components/layout/TopBar/TopBar";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import { BodyMuscleIcon } from "@/components/ui/BodyMuscleIcon/BodyMuscleIcon";
import {
  EXERCISES,
  MUSCLE_GROUPS,
  resolveMeasurementType,
  getGroupedExercises,
  EQUIPMENT_LABELS,
  type MeasurementType,
  type ExerciseDef,
} from "@/lib/exercises-data";
import styles from "./page.module.css";

// ── Draft types ───────────────────────────────────────────────
interface DraftSet {
  reps: string;
  weight: string;
  duration: string; // seconds (timed) or minutes (cardio)
  distance: string; // km (cardio)
}

interface DraftExercise {
  reId: string | null;
  exerciseId: string;
  name: string;
  muscle: string;
  measurementType: MeasurementType;
  sets: DraftSet[];
  orderIndex: number;
}

// ── Set helpers ───────────────────────────────────────────────
function emptySet(type: MeasurementType): DraftSet {
  switch (type) {
    case "timed":   return { reps: "", weight: "", duration: "30", distance: "" };
    // Cardio is time-only now — distance is no longer tracked. We still
    // store the field as "" so the persisted shape stays compatible with
    // any older routine_exercises rows that have a distance set.
    case "cardio":  return { reps: "", weight: "", duration: "20", distance: "" };
    default:        return { reps: "12", weight: "", duration: "", distance: "" };
  }
}

function defaultSets(type: MeasurementType): DraftSet[] {
  const count = type === "cardio" ? 1 : type === "weight_reps" ? 4 : 3;
  return Array.from({ length: count }, () => emptySet(type));
}

// Labels per measurement type
const COL_LABELS: Record<MeasurementType, string[]> = {
  weight_reps:     ["SET", "REPS", "KG"],
  bodyweight_reps: ["SET", "REPS"],
  reps_only:       ["SET", "REPS"],
  timed:           ["SET", "SEC"],
  cardio:          ["MIN"],
};

export default function EditRoutinePage() {
  const { id } = useParams<{ id: string }>();
  const { supabase, user } = useAuth();
  const router = useRouter();

  const [title, setTitle]       = useState("");
  const [exercises, setExercises] = useState<DraftExercise[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");

  // Bottom sheet
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedMuscle, setSelectedMuscle] = useState("");
  const [query, setQuery]         = useState("");
  // Tracks per-exercise-name "adding…" feedback so the picker stays
  // responsive while the upsert round-trip resolves in the background.
  const [pendingNames, setPendingNames] = useState<Set<string>>(() => new Set());

  // Scroll refs
  const exerciseRefs = useRef<(HTMLDivElement | null)[]>([]);
  // Live mirror of `exercises` so handleSave can wait on the latest state
  // without being trapped by a stale closure.
  const exercisesRef = useRef<DraftExercise[]>([]);

  // ── Exercise lists ───────────────────────────────────────────
  // O(1) lookup for "is this exercise already in the routine?" so the
  // sheet doesn't run `exercises.some()` per row × per render (174² scans
  // on every keystroke before this).
  const addedNames = useMemo(
    () => new Set(exercises.map(e => e.name.toLowerCase())),
    [exercises],
  );

  // Flat search results (used when a query is active). Memoised so typing
  // in the search box doesn't refilter 174 exercises on every keystroke.
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    return EXERCISES.filter(ex => {
      if (selectedMuscle && ex.muscle !== selectedMuscle) return false;
      if (q && !ex.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [query, selectedMuscle]);

  // Grouped by equipment (used when a muscle is selected with no search query)
  const groupedExercises = useMemo(
    () => (selectedMuscle && !query ? getGroupedExercises(selectedMuscle) : null),
    [selectedMuscle, query],
  );

  // ── Load existing routine ────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from("routines")
        .select("*, routine_exercises(*, exercises(*))")
        .eq("id", id)
        .single();
      if (err || !data) { router.replace("/routines"); return; }

      setTitle((data.name as string) ?? (data.title as string) ?? "");

      const res = ((data.routine_exercises as Record<string, unknown>[]) ?? [])
        .slice()
        .sort((a, b) => ((a.order_index ?? 0) as number) - ((b.order_index ?? 0) as number));

      const mapped: DraftExercise[] = res.map((re, i) => {
        const ex = (re.exercises as Record<string, unknown>) ?? {};
        const exName = (ex.name as string) ?? "";
        // Coerce through the validated resolver so legacy DB rows with
        // null / empty / typo'd `measurement_type` still resolve to a real
        // type (typically `weight_reps`) instead of falling through to an
        // empty SetRow with no inputs.
        const measurementType: MeasurementType = resolveMeasurementType(ex.measurement_type, exName);

        let sets: DraftSet[];
        const setsConfig = re.sets_config as Array<Record<string, unknown>> | null;

        if (Array.isArray(setsConfig) && setsConfig.length > 0) {
          sets = setsConfig.map(s => ({
            reps:     s.reps     != null ? String(s.reps)     : "",
            weight:   s.weight   != null ? String(s.weight)   : "",
            duration: s.duration != null ? String(s.duration) : "",
            distance: s.distance != null ? String(s.distance) : "",
          }));
        } else {
          // Legacy: build from flat fields
          const count = (re.sets as number) ?? 4;
          sets = Array.from({ length: count }, () => emptySet(measurementType));
          if (measurementType === "weight_reps") {
            sets = sets.map(s => ({
              ...s,
              reps:   String((re.reps as number)   ?? 12),
              weight: String((re.weight as number) ?? ""),
            }));
          }
        }

        return {
          reId: re.id as string,
          exerciseId: re.exercise_id as string,
          name: exName,
          muscle: (ex.muscle_group as string) ?? "",
          measurementType,
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
  useEffect(() => { exercisesRef.current = exercises; }, [exercises]);

  // ── Sheet helpers ────────────────────────────────────────────
  function openSheet() { setQuery(""); setSheetOpen(true); }
  function closeSheet() { setSheetOpen(false); }

  // ── Add exercise from picker (optimistic) ────────────────────
  // Adds the row to local state synchronously, closes the sheet, and
  // resolves the real `exerciseId` in the background. The user can edit
  // sets / weights / reps immediately; if they hit Save before the
  // round-trip finishes, handleSave waits via flushPendingExercises().
  function handleAdd(def: typeof EXERCISES[number]) {
    const lowerName = def.name.toLowerCase();
    if (addedNames.has(lowerName)) {
      closeSheet();
      return;
    }
    setError("");

    const placeholder: DraftExercise = {
      reId: null,
      exerciseId: "",                 // filled in by the background lookup
      name: def.name,
      muscle: def.muscle,
      measurementType: def.type,
      sets: defaultSets(def.type),
      orderIndex: exercises.length,
    };

    setExercises(prev => [...prev, placeholder]);
    setPendingNames(prev => {
      const next = new Set(prev);
      next.add(lowerName);
      return next;
    });
    closeSheet();

    requestAnimationFrame(() => {
      const last = exerciseRefs.current[exerciseRefs.current.length - 1];
      last?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    // Background: resolve exerciseId, patch local state when ready.
    void (async () => {
      try {
        let exerciseId = "";
        const { data: existing } = await supabase
          .from("exercises")
          .select("id")
          .ilike("name", def.name)
          .limit(1)
          .maybeSingle();

        if (existing?.id) {
          exerciseId = existing.id as string;
        } else {
          const { data: ins, error: insErr } = await supabase
            .from("exercises")
            .insert({
              name: def.name,
              muscle_group: def.muscle,
              measurement_type: def.type,
              is_custom: true,
              created_by_user_id: user?.id ?? null,
            })
            .select("id")
            .single();
          if (insErr || !ins) {
            setError(insErr?.message ?? "Could not add exercise");
            // Roll back the optimistic add
            setExercises(prev => prev.filter(e => e.name.toLowerCase() !== lowerName));
            return;
          }
          exerciseId = ins.id as string;
        }

        setExercises(prev =>
          prev.map(e =>
            e.name.toLowerCase() === lowerName && !e.exerciseId
              ? { ...e, exerciseId }
              : e,
          ),
        );
      } finally {
        setPendingNames(prev => {
          if (!prev.has(lowerName)) return prev;
          const next = new Set(prev);
          next.delete(lowerName);
          return next;
        });
      }
    })();
  }

  // ── Exercise / set mutations ─────────────────────────────────
  function removeExercise(idx: number) {
    setExercises(prev => prev.filter((_, i) => i !== idx).map((e, i) => ({ ...e, orderIndex: i })));
  }

  function addSet(exIdx: number) {
    setExercises(prev => prev.map((ex, i) => {
      if (i !== exIdx) return ex;
      const last = ex.sets[ex.sets.length - 1] ?? emptySet(ex.measurementType);
      return { ...ex, sets: [...ex.sets, { ...last }] };
    }));
  }

  function removeSet(exIdx: number, setIdx: number) {
    setExercises(prev => prev.map((ex, i) => {
      if (i !== exIdx || ex.sets.length <= 1) return ex;
      return { ...ex, sets: ex.sets.filter((_, si) => si !== setIdx) };
    }));
  }

  function updateSet(exIdx: number, setIdx: number, field: keyof DraftSet, value: string) {
    setExercises(prev => prev.map((ex, i) => {
      if (i !== exIdx) return ex;
      return { ...ex, sets: ex.sets.map((s, si) => si === setIdx ? { ...s, [field]: value } : s) };
    }));
  }

  // ── Save ─────────────────────────────────────────────────────
  async function handleSave() {
    if (!title.trim()) { setError("Routine name is required"); return; }
    setSaving(true);
    setError("");
    try {
      // If a background upsert from a recent optimistic add is still in
      // flight, wait for it. We don't want to save routine_exercises rows
      // with an empty exercise_id. Polls the live ref so we see fresh
      // state, not the stale closure value.
      const start = Date.now();
      while (
        exercisesRef.current.some(e => !e.exerciseId) &&
        Date.now() - start < 4000
      ) {
        await new Promise(r => setTimeout(r, 100));
      }
      if (exercisesRef.current.some(e => !e.exerciseId)) {
        throw new Error("Adding an exercise is still in progress — try again in a moment.");
      }
      const latestExercises = exercisesRef.current;

      const { error: nameErr } = await supabase.from("routines").update({ name: title.trim() }).eq("id", id);
      if (nameErr) throw new Error(nameErr.message);

      const { error: delErr } = await supabase.from("routine_exercises").delete().eq("routine_id", id);
      if (delErr) throw new Error(delErr.message);

      if (latestExercises.length > 0) {
        const rows = latestExercises.map((ex, i) => {
          const setsConfig = ex.sets.map(s => ({
            reps:     s.reps     ? (parseInt(s.reps)     || null) : null,
            weight:   s.weight   ? (parseFloat(s.weight) || null) : null,
            duration: s.duration ? (parseInt(s.duration) || null) : null,
            distance: s.distance ? (parseFloat(s.distance) || null) : null,
          }));
          return {
            routine_id: id,
            exercise_id: ex.exerciseId,
            order_index: i,
            sets_config: setsConfig,
          };
        });
        const { error: insertErr } = await supabase.from("routine_exercises").insert(rows);
        if (insertErr) throw new Error(insertErr.message);
      }

      router.replace("/dashboard");
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
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Push Day, Leg Day…"
          />
        </div>

        {error && <p className={styles.error}>{error}</p>}

        {/* Exercise blocks */}
        {exercises.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="9" width="4" height="6" rx="1" stroke="var(--text-tertiary)" strokeWidth="1.5"/>
                <rect x="17" y="9" width="4" height="6" rx="1" stroke="var(--text-tertiary)" strokeWidth="1.5"/>
                <rect x="7" y="10.5" width="10" height="3" rx="1.5" stroke="var(--text-tertiary)" strokeWidth="1.5"/>
              </svg>
            </div>
            <p className={styles.emptyTitle}>No exercises yet</p>
            <p className={styles.emptySub}>Choose a muscle group below to add your first exercise</p>
          </div>
        ) : (
          exercises.map((ex, exIdx) => {
            const cols = COL_LABELS[ex.measurementType];
            const isCardio      = ex.measurementType === "cardio";
            const isTimed       = ex.measurementType === "timed";
            const isWeighted    = ex.measurementType === "weight_reps";
            const isRepsOnly    = ex.measurementType !== "cardio" && ex.measurementType !== "timed";

            return (
              <div
                key={`${ex.exerciseId}-${exIdx}`}
                className={styles.exBlock}
                ref={el => { exerciseRefs.current[exIdx] = el; }}
              >
                {/* Header */}
                <div className={styles.exHeader}>
                  <div className={styles.exIconCircle}>
                    <BodyMuscleIcon muscles={[ex.muscle]} variant="thumb" />
                  </div>
                  <div className={styles.exMeta}>
                    <p className={styles.exName}>{ex.name}</p>
                    <p className={styles.exType}>{typeLabel(ex.measurementType)}</p>
                  </div>
                  <button type="button" className={styles.exRemoveBtn} onClick={() => removeExercise(exIdx)} aria-label="Remove">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M18 6L6 18M6 6l12 12" stroke="var(--accent-red)" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>

                {/* Column headers */}
                <div className={styles.setsTableHead} data-type={ex.measurementType}>
                  {!isCardio && <span className={styles.setNumCol}>SET</span>}
                  {cols.slice(isCardio ? 0 : 1).map(c => (
                    <span key={c} className={styles.setColLabel}>{c}</span>
                  ))}
                  <span />
                </div>

                {/* Set rows */}
                {ex.sets.map((s, setIdx) => (
                  <div key={setIdx} className={styles.setRow} data-type={ex.measurementType}>
                    {!isCardio && <span className={styles.setNumBadge}>{setIdx + 1}</span>}

                    {/* REPS / REPS-ONLY input */}
                    {isRepsOnly && (
                      <input
                        className={styles.setInput}
                        type="number" inputMode="numeric" min="1"
                        value={s.reps}
                        onChange={e => updateSet(exIdx, setIdx, "reps", e.target.value)}
                        placeholder="12"
                      />
                    )}

                    {/* KG input — only for weight_reps */}
                    {isWeighted && (
                      <input
                        className={styles.setInput}
                        type="number" inputMode="decimal" min="0" step="0.5"
                        value={s.weight}
                        onChange={e => updateSet(exIdx, setIdx, "weight", e.target.value)}
                        placeholder="—"
                      />
                    )}

                    {/* DURATION input — timed (seconds) */}
                    {isTimed && (
                      <input
                        className={styles.setInput}
                        type="number" inputMode="numeric" min="1"
                        value={s.duration}
                        onChange={e => updateSet(exIdx, setIdx, "duration", e.target.value)}
                        placeholder="30"
                      />
                    )}

                    {/* DURATION (minutes) — cardio (time-only) */}
                    {isCardio && (
                      <input
                        className={styles.setInput}
                        type="number" inputMode="numeric" min="1"
                        value={s.duration}
                        onChange={e => updateSet(exIdx, setIdx, "duration", e.target.value)}
                        placeholder="20"
                      />
                    )}

                    {/* Remove set */}
                    <button
                      type="button"
                      className={styles.setRemoveBtn}
                      onClick={() => removeSet(exIdx, setIdx)}
                      disabled={ex.sets.length <= 1}
                      aria-label="Remove set"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M18 6L6 18M6 6l12 12"
                          stroke={ex.sets.length <= 1 ? "var(--text-disabled)" : "var(--accent-red)"}
                          strokeWidth="2" strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  </div>
                ))}

                {/* Add set (no extra "sessions" for cardio) */}
                <button type="button" className={styles.addSetBtn} onClick={() => addSet(exIdx)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M12 5v14M5 12h14" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round"/>
                  </svg>
                  {isCardio ? "Add Session" : "Add Set"}
                </button>
              </div>
            );
          })
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

      {/* ── Bottom Sheet ─────────────────────────────────────────── */}
      {sheetOpen && <div className={styles.sheetBackdrop} onClick={closeSheet} />}
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

        {/* Search */}
        <div className={styles.sheetSearch}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="var(--text-tertiary)" strokeWidth="2"/>
            <path d="M21 21l-4.35-4.35" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input
            className={styles.sheetSearchInput}
            placeholder="Search exercises…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoComplete="off"
          />
          {query && (
            <button type="button" className={styles.sheetSearchClear} onClick={() => setQuery("")}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>

        {/* Muscle chips */}
        <div className={styles.chipGrid}>
          <button
            type="button"
            className={[styles.chip, selectedMuscle === "" ? styles.chipActive : ""].join(" ")}
            onClick={() => { setSelectedMuscle(""); setQuery(""); }}
          >
            <span className={styles.chipEmoji}>💪</span>
            <span className={styles.chipLabel}>All</span>
          </button>
          {MUSCLE_GROUPS.map(mg => (
            <button
              key={mg.id}
              type="button"
              className={[styles.chip, selectedMuscle === mg.id ? styles.chipActive : ""].join(" ")}
              onClick={() => { setSelectedMuscle(mg.id); setQuery(""); }}
            >
              <span className={styles.chipEmoji}>{mg.emoji}</span>
              <span className={styles.chipLabel}>{mg.label}</span>
            </button>
          ))}
        </div>

        {/* Exercise list */}
        <div className={styles.sheetList}>
          {groupedExercises ? (
            /* ── Grouped by equipment (muscle selected, no search) ── */
            groupedExercises.length === 0 ? (
              <p className={styles.sheetEmpty}>No exercises found</p>
            ) : (
              groupedExercises.map(group => (
                <div key={group.equipment} className={styles.equipGroup}>
                  <div className={styles.equipHeader}>
                    <span className={styles.equipLine} />
                    <span className={styles.equipLabel}>{group.label}</span>
                    <span className={styles.equipLine} />
                  </div>
                  {group.exercises.map(def => (
                    <SheetItem
                      key={def.name}
                      def={def}
                      alreadyAdded={addedNames.has(def.name.toLowerCase())}
                      pending={pendingNames.has(def.name.toLowerCase())}
                      onAdd={() => handleAdd(def)}
                    />
                  ))}
                </div>
              ))
            )
          ) : (
            /* ── Flat search results ── */
            searchResults.length === 0 ? (
              <p className={styles.sheetEmpty}>No exercises found</p>
            ) : (
              searchResults.map(def => (
                <SheetItem
                  key={def.name}
                  def={def}
                  alreadyAdded={addedNames.has(def.name.toLowerCase())}
                  pending={pendingNames.has(def.name.toLowerCase())}
                  onAdd={() => handleAdd(def)}
                />
              ))
            )
          )}
        </div>
      </div>
    </div>
  );
}

// ── Reusable exercise row inside the sheet ────────────────────
// Wrapped in `memo` so a single keystroke in the search input doesn't
// re-render every row in the list (174 exercises × BodyMuscleIcon SVGs).
const SheetItem = memo(function SheetItem({
  def,
  alreadyAdded,
  pending,
  onAdd,
}: {
  def: ExerciseDef;
  alreadyAdded: boolean;
  pending: boolean;
  onAdd: () => void;
}) {
  return (
    <button
      type="button"
      className={[styles.sheetItem, alreadyAdded ? styles.sheetItemAdded : ""].join(" ")}
      onClick={() => !alreadyAdded && onAdd()}
      disabled={alreadyAdded || pending}
    >
      <div className={styles.sheetItemIcon}>
        <BodyMuscleIcon muscles={[def.muscle]} variant="thumb" />
      </div>
      <div className={styles.sheetItemInfo}>
        <p className={styles.sheetItemName}>{def.name}</p>
        <p className={styles.sheetItemMeta}>
          <span className={styles.sheetItemMuscle}>
            {def.muscle.charAt(0).toUpperCase() + def.muscle.slice(1)}
          </span>
          <span className={styles.sheetItemTypePill} data-type={def.type}>
            {typeLabel(def.type)}
          </span>
        </p>
      </div>
      <div className={styles.sheetItemAction}>
        {alreadyAdded ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : pending ? (
          <Spinner size={16} />
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" fill="var(--accent)"/>
            <path d="M12 7v10M7 12h10" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        )}
      </div>
    </button>
  );
});

function typeLabel(t: MeasurementType): string {
  switch (t) {
    case "weight_reps":     return "Sets × Reps × Weight";
    case "bodyweight_reps": return "Sets × Reps";
    case "reps_only":       return "Sets × Reps";
    case "timed":           return "Sets × Duration";
    case "cardio":          return "Time + Distance";
  }
}
