"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import styles from "./AiRoutineModal.module.css";

interface AiDay {
  title: string;
  exercises: Array<{
    name: string;
    muscleGroup: string;
    sets: number;
    repRange: string;
    restSeconds: number;
    note: string;
  }>;
}
interface AiRoutine {
  name: string;
  description: string;
  days: AiDay[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function AiRoutineModal({ open, onClose, onCreated }: Props) {
  const { supabase, user } = useAuth();

  const [goal,          setGoal]         = useState("hypertrophy");
  const [experience,    setExperience]   = useState("intermediate");
  const [daysPerWeek,   setDaysPerWeek]  = useState(4);
  const [equipment,     setEquipment]    = useState("full gym");
  const [focus,         setFocus]        = useState("");

  const [generating,    setGenerating]   = useState(false);
  const [saving,        setSaving]       = useState(false);
  const [routine,       setRoutine]      = useState<AiRoutine | null>(null);
  const [error,         setError]        = useState<string | null>(null);

  if (!open) return null;

  async function generate() {
    setGenerating(true);
    setError(null);
    setRoutine(null);
    try {
      const res = await fetch("/api/ai/routine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal, experience, daysPerWeek, equipment, focus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      setRoutine(data.routine as AiRoutine);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function findExerciseIdByName(name: string, muscleGroup: string): Promise<string | null> {
    // Try exact match
    const { data: exact } = await supabase
      .from("exercises")
      .select("id")
      .ilike("name", name)
      .limit(1);
    const exactHit = exact?.[0];
    if (exactHit?.id) return exactHit.id as string;

    // Try fuzzy — first word(s) then also muscle-group filter
    const first = (name.split(/[\s\-,]+/)[0] ?? name) || name;
    const { data: fuzzy } = await supabase
      .from("exercises")
      .select("id, name")
      .ilike("name", `%${first}%`)
      .limit(5);
    const fuzzyHit = fuzzy?.[0];
    if (fuzzyHit?.id) return fuzzyHit.id as string;

    // Insert as custom exercise
    const { data: inserted } = await supabase
      .from("exercises")
      .insert({
        name,
        muscle_group: muscleGroup || null,
        is_custom: true,
        created_by_user_id: user?.id ?? null,
      })
      .select("id")
      .single();
    return inserted?.id ?? null;
  }

  async function save() {
    if (!routine || !user) return;
    setSaving(true);
    setError(null);
    try {
      // Create one routine per day (many Hevy users expect this structure)
      for (let dayIdx = 0; dayIdx < routine.days.length; dayIdx++) {
        const day = routine.days[dayIdx];
        if (!day) continue;

        const routineName = routine.days.length > 1
          ? `${routine.name} — ${day.title}`
          : routine.name;

        const { data: newRoutine, error: rErr } = await supabase
          .from("routines")
          .insert({
            user_id: user.id,
            name: routineName,
            description: routine.description,
          })
          .select()
          .single();
        if (rErr || !newRoutine) throw new Error(rErr?.message ?? "Routine insert failed");

        // Resolve exercise IDs (sequentially to avoid N duplicate custom inserts)
        const reRows: Array<Record<string, unknown>> = [];
        for (let i = 0; i < day.exercises.length; i++) {
          const ex = day.exercises[i];
          if (!ex) continue;
          const exId = await findExerciseIdByName(ex.name, ex.muscleGroup);
          if (!exId) continue;

          // Build sets_config: [{ reps: target }] × ex.sets
          const repTarget = parseInt(ex.repRange?.split("-")[0] ?? "10", 10) || 10;
          const setsConfig = Array.from({ length: Math.max(1, ex.sets) }, () => ({
            reps: repTarget,
            weight: null,
          }));

          reRows.push({
            routine_id: newRoutine.id,
            exercise_id: exId,
            order_index: i,
            sets_config: setsConfig,
          });
        }

        if (reRows.length > 0) {
          await supabase.from("routine_exercises").insert(reRows);
        }
      }

      onCreated();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={() => !generating && !saving && onClose()}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.kicker}>✨ AI Coach</span>
          <h2 className={styles.title}>Build a Routine</h2>
          <button className={styles.closeBtn} onClick={onClose} type="button" aria-label="Close">×</button>
        </div>

        {!routine ? (
          <>
            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span>Goal</span>
                <select value={goal} onChange={e => setGoal(e.target.value)}>
                  <option value="hypertrophy">Hypertrophy (build muscle)</option>
                  <option value="strength">Strength (max weight)</option>
                  <option value="fat loss">Fat loss</option>
                  <option value="general fitness">General fitness</option>
                  <option value="powerlifting">Powerlifting</option>
                </select>
              </label>
              <label className={styles.field}>
                <span>Experience</span>
                <select value={experience} onChange={e => setExperience(e.target.value)}>
                  <option value="beginner">Beginner (&lt;1y)</option>
                  <option value="intermediate">Intermediate (1-3y)</option>
                  <option value="advanced">Advanced (3y+)</option>
                </select>
              </label>
              <label className={styles.field}>
                <span>Days / week</span>
                <select value={daysPerWeek} onChange={e => setDaysPerWeek(parseInt(e.target.value))}>
                  {[2,3,4,5,6].map(n => <option key={n} value={n}>{n} days</option>)}
                </select>
              </label>
              <label className={styles.field}>
                <span>Equipment</span>
                <select value={equipment} onChange={e => setEquipment(e.target.value)}>
                  <option value="full gym">Full gym</option>
                  <option value="dumbbells and bench">Dumbbells + bench</option>
                  <option value="dumbbells only">Dumbbells only</option>
                  <option value="bodyweight">Bodyweight only</option>
                  <option value="home gym with squat rack">Home gym w/ rack</option>
                </select>
              </label>
              <label className={styles.fieldFull}>
                <span>Focus (optional)</span>
                <input
                  type="text"
                  placeholder="e.g. bigger arms, stronger squat"
                  value={focus}
                  onChange={e => setFocus(e.target.value)}
                />
              </label>
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <button
              type="button"
              className={styles.primary}
              onClick={generate}
              disabled={generating}
            >
              {generating ? "Generating…" : "✨ Generate Routine"}
            </button>
          </>
        ) : (
          <>
            <div className={styles.preview}>
              <h3 className={styles.previewTitle}>{routine.name}</h3>
              <p className={styles.previewDesc}>{routine.description}</p>
              {routine.days.map((day, i) => (
                <div key={i} className={styles.dayCard}>
                  <p className={styles.dayTitle}>{day.title}</p>
                  {day.exercises.map((ex, j) => (
                    <div key={j} className={styles.exRow}>
                      <span className={styles.exName}>{ex.name}</span>
                      <span className={styles.exMeta}>{ex.sets} × {ex.repRange}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.secondary}
                onClick={() => setRoutine(null)}
                disabled={saving}
              >
                Regenerate
              </button>
              <button
                type="button"
                className={styles.primary}
                onClick={save}
                disabled={saving}
              >
                {saving ? "Saving…" : `Save ${routine.days.length > 1 ? `${routine.days.length} routines` : "routine"}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
