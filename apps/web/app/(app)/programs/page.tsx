"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { TopBar } from "@/components/layout/TopBar/TopBar";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import {
  PROGRAM_TEMPLATES,
  type ProgramTemplate,
} from "@/lib/programTemplates";
import styles from "./page.module.css";

// ── Filter options ──────────────────────────────────────────
const LEVELS = ["All", "Beginner", "Intermediate", "Advanced"] as const;
const GOALS = ["All", "Strength", "Hypertrophy", "General", "Powerlifting"] as const;

// ── Badge class helpers ─────────────────────────────────────
const LEVEL_BADGE: Record<string, string | undefined> = {
  beginner: styles.badgeBeginner,
  intermediate: styles.badgeIntermediate,
  advanced: styles.badgeAdvanced,
};

const GOAL_BADGE: Record<string, string | undefined> = {
  strength: styles.badgeStrength,
  hypertrophy: styles.badgeHypertrophy,
  general: styles.badgeGeneral,
  powerlifting: styles.badgePowerlifting,
};

export default function ProgramsPage() {
  const { supabase, user } = useAuth();
  const router = useRouter();

  const [levelFilter, setLevelFilter] = useState<string>("All");
  const [goalFilter, setGoalFilter] = useState<string>("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // ── Filtering ─────────────────────────────────────────────
  const filtered = PROGRAM_TEMPLATES.filter((p) => {
    if (levelFilter !== "All" && p.level !== levelFilter.toLowerCase()) return false;
    if (goalFilter !== "All" && p.goal !== goalFilter.toLowerCase()) return false;
    return true;
  });

  // ── Show toast ────────────────────────────────────────────
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  // ── Copy program as routines ──────────────────────────────
  async function handleUseProgram(program: ProgramTemplate) {
    if (!user) return;
    setCopyingId(program.id);

    try {
      for (const day of program.days) {
        // 1. Create the routine
        const { data: routine, error: rErr } = await supabase
          .from("routines")
          .insert({
            user_id: user.id,
            name: `${program.name} - ${day.name}`,
            description: program.description,
          })
          .select("id")
          .single();

        if (rErr || !routine) {
          throw new Error(rErr?.message ?? "Failed to create routine");
        }

        // 2. Look up each exercise and insert into routine_exercises
        for (let i = 0; i < day.exercises.length; i++) {
          const ex = day.exercises[i]!;

          // Find exercise by name in exercises table
          const { data: found } = await supabase
            .from("exercises")
            .select("id")
            .ilike("name", ex.name)
            .limit(1)
            .maybeSingle();

          if (!found) continue; // skip if exercise not in DB

          // Build sets_config array
          const setsConfig = Array.from({ length: ex.sets }, () => ({
            reps: null,
            weightKg: null,
          }));

          await supabase.from("routine_exercises").insert({
            routine_id: routine.id,
            exercise_id: found.id,
            order_index: i,
            sets_config: setsConfig,
          });
        }
      }

      showToast(`"${program.name}" added to your routines!`);

      // Short delay so the user sees the toast, then navigate
      setTimeout(() => {
        router.push("/routines");
      }, 1200);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      showToast(`Error: ${msg}`);
    } finally {
      setCopyingId(null);
    }
  }

  return (
    <div className={styles.page}>
      <TopBar title="Programs" showBack />

      {/* ── Filter chips ── */}
      <div className={styles.filters}>
        <div>
          <p className={styles.filterLabel}>Level</p>
          <div className={styles.filterRow}>
            {LEVELS.map((l) => (
              <button
                key={l}
                type="button"
                className={`${styles.chip} ${levelFilter === l ? styles.chipActive : ""}`}
                onClick={() => setLevelFilter(l)}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className={styles.filterLabel}>Goal</p>
          <div className={styles.filterRow}>
            {GOALS.map((g) => (
              <button
                key={g}
                type="button"
                className={`${styles.chip} ${goalFilter === g ? styles.chipActive : ""}`}
                onClick={() => setGoalFilter(g)}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Results count ── */}
      <p className={styles.resultsCount}>
        {filtered.length} program{filtered.length !== 1 ? "s" : ""}
      </p>

      {/* ── Program cards ── */}
      {filtered.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyText}>
            No programs match these filters. Try broadening your selection.
          </p>
        </div>
      ) : (
        <div className={styles.list}>
          {filtered.map((program) => {
            const isExpanded = expandedId === program.id;
            const isCopying = copyingId === program.id;

            return (
              <div key={program.id} className={styles.card}>
                {/* Header row */}
                <div className={styles.cardHeader}>
                  <span className={styles.cardName}>{program.name}</span>
                  <span className={styles.cardFreq}>
                    {program.daysPerWeek} days/week
                  </span>
                </div>

                {/* Badges */}
                <div className={styles.badges}>
                  <span className={`${styles.badge} ${LEVEL_BADGE[program.level] ?? ""}`}>
                    {program.level}
                  </span>
                  <span className={`${styles.badge} ${GOAL_BADGE[program.goal] ?? ""}`}>
                    {program.goal}
                  </span>
                </div>

                {/* Description */}
                <p className={styles.cardDesc}>{program.description}</p>

                {/* Tags */}
                <div className={styles.tags}>
                  {program.tags.map((t) => (
                    <span key={t} className={styles.tag}>
                      {t}
                    </span>
                  ))}
                </div>

                {/* Expand toggle */}
                <button
                  type="button"
                  className={styles.expandBtn}
                  onClick={() => setExpandedId(isExpanded ? null : program.id)}
                >
                  <span
                    className={`${styles.expandIcon} ${isExpanded ? styles.expandIconOpen : ""}`}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M6 9l6 6 6-6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  {isExpanded ? "Hide exercises" : `View ${program.days.length} days`}
                </button>

                {/* Expanded days */}
                {isExpanded && (
                  <div className={styles.daysSection}>
                    {program.days.map((day) => (
                      <div key={day.name} className={styles.dayCard}>
                        <p className={styles.dayName}>{day.name}</p>
                        <div className={styles.exerciseList}>
                          {day.exercises.map((ex, i) => (
                            <div key={`${ex.name}-${i}`} className={styles.exerciseRow}>
                              <span className={styles.exerciseName}>{ex.name}</span>
                              <span className={styles.exerciseSets}>
                                {ex.sets} x {ex.reps}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Use button */}
                <button
                  type="button"
                  className={styles.useBtn}
                  onClick={() => handleUseProgram(program)}
                  disabled={isCopying || copyingId !== null}
                >
                  {isCopying ? (
                    <>
                      <Spinner size={18} color="#fff" />
                      Copying...
                    </>
                  ) : (
                    "Use This Program"
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Toast */}
      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}
