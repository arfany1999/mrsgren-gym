"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { TopBar } from "@/components/layout/TopBar/TopBar";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import {
  PROGRAM_TEMPLATES,
  type ProgramTemplate,
} from "@/lib/programTemplates";
import {
  enrollInProgram,
  endActiveProgram,
  getActiveEnrollment,
  type ActiveEnrollment,
} from "@/lib/programs";
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
  const [actingId, setActingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Active enrollment for this user (null = not following a program).
  const [active, setActive] = useState<ActiveEnrollment | null>(null);
  const [activeLoading, setActiveLoading] = useState(true);

  const loadActive = useCallback(async () => {
    if (!user) {
      setActive(null);
      setActiveLoading(false);
      return;
    }
    setActiveLoading(true);
    try {
      const a = await getActiveEnrollment(supabase, user.id);
      setActive(a);
    } catch {
      setActive(null);
    } finally {
      setActiveLoading(false);
    }
  }, [supabase, user]);

  useEffect(() => {
    loadActive();
  }, [loadActive]);

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

  // ── Start (or switch to) a program ────────────────────────
  async function handleStart(template: ProgramTemplate) {
    if (!user || actingId) return;

    // If switching, confirm first.
    if (active && active.program_id !== template.id) {
      const ok = window.confirm(
        `You're currently following "${active.program_name}". Switching to "${template.name}" will end the current program. Continue?`
      );
      if (!ok) return;
    }

    setActingId(template.id);
    try {
      await enrollInProgram(supabase, user.id, template);
      showToast(`Started "${template.name}". Routines added.`);
      await loadActive();
      // Give the user a beat to see the toast, then take them to the active
      // program's first workout (via the routines list).
      setTimeout(() => router.push("/routines"), 1100);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      showToast(`Error: ${msg}`);
    } finally {
      setActingId(null);
    }
  }

  // ── End the active program ────────────────────────────────
  async function handleEnd() {
    if (!user || !active) return;
    const ok = window.confirm(
      `End "${active.program_name}"? Your routines will stay — only the program tracking stops.`
    );
    if (!ok) return;
    setActingId(`end:${active.id}`);
    try {
      await endActiveProgram(supabase, user.id);
      showToast("Program ended.");
      await loadActive();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      showToast(`Error: ${msg}`);
    } finally {
      setActingId(null);
    }
  }

  // ── Active enrollment banner ──────────────────────────────
  function ActiveBanner() {
    if (!active) return null;
    const dayNum = active.currentDayIndex + 1;
    const total = active.total_days;
    const week = active.weeksCompleted + 1;
    const nextRoutineId = active.nextRoutineId;
    const isEnding = actingId === `end:${active.id}`;

    return (
      <div className={styles.activeBanner}>
        <div className={styles.activeBannerHeader}>
          <span className={styles.activeBannerLabel}>Following</span>
          <button
            type="button"
            className={styles.activeBannerEnd}
            onClick={handleEnd}
            disabled={isEnding}
          >
            {isEnding ? "Ending…" : "End program"}
          </button>
        </div>
        <p className={styles.activeBannerName}>{active.program_name}</p>
        <p className={styles.activeBannerProgress}>
          Day {dayNum} of {total} · Week {week}
          {active.completedCount > 0 && (
            <span className={styles.activeBannerCount}>
              {" "}· {active.completedCount} workout{active.completedCount === 1 ? "" : "s"} done
            </span>
          )}
        </p>
        {nextRoutineId && (
          <button
            type="button"
            className={styles.activeBannerStart}
            onClick={() => router.push(`/routines/${nextRoutineId}`)}
          >
            Open today&apos;s workout
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <TopBar title="Programs" showBack />

      {/* ── Active enrollment banner ── */}
      {!activeLoading && <ActiveBanner />}

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
            const isActing = actingId === program.id;
            const isActive = active?.program_id === program.id;
            const someoneElseActing = actingId !== null && !isActing;

            // Decide which CTA to show.
            let ctaLabel: string;
            if (isActing) ctaLabel = active && active.program_id !== program.id ? "Switching…" : "Starting…";
            else if (isActive) ctaLabel = "Currently active";
            else if (active) ctaLabel = "Switch to this program";
            else ctaLabel = "Start Program";

            return (
              <div
                key={program.id}
                className={`${styles.card} ${isActive ? styles.cardActive : ""}`}
              >
                {/* Header row */}
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitleRow}>
                    <span className={styles.cardName}>{program.name}</span>
                    {isActive && <span className={styles.activePill}>Active</span>}
                  </div>
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

                {/* CTA */}
                <button
                  type="button"
                  className={`${styles.useBtn} ${isActive ? styles.useBtnActive : ""}`}
                  onClick={() => !isActive && handleStart(program)}
                  disabled={isActing || someoneElseActing || isActive}
                >
                  {isActing ? (
                    <>
                      <Spinner size={18} color="#fff" />
                      {ctaLabel}
                    </>
                  ) : (
                    ctaLabel
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
