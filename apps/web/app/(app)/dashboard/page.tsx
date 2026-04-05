"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkout } from "@/contexts/WorkoutContext";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import { parseMuscleGroup } from "@/lib/formatters";
import styles from "./page.module.css";

interface RoutineExercise {
  id: string;
  name: string;
  muscleGroups: string[];
}

interface Routine {
  id: string;
  title: string;
  exercises: RoutineExercise[];
  totalSets: number;
}

const MUSCLE_GRADIENTS: Record<string, [string, string]> = {
  chest:      ["#e05c5c", "#f97316"],
  lats:       ["#5b7cf8", "#818cf8"],
  back:       ["#5b7cf8", "#818cf8"],
  shoulders:  ["#a78bfa", "#c084fc"],
  biceps:     ["#f59e0b", "#fbbf24"],
  triceps:    ["#f97316", "#fb923c"],
  quadriceps: ["#10b981", "#34d399"],
  quads:      ["#10b981", "#34d399"],
  hamstrings: ["#059669", "#10b981"],
  glutes:     ["#0d9488", "#14b8a6"],
  calves:     ["#0891b2", "#22d3ee"],
  abdominals: ["#eab308", "#fde047"],
  abs:        ["#eab308", "#fde047"],
  core:       ["#eab308", "#fde047"],
  traps:      ["#6366f1", "#818cf8"],
  forearms:   ["#d97706", "#f59e0b"],
  cardio:     ["#ec4899", "#f472b6"],
};

const ALL_GRADIENTS = Object.values(MUSCLE_GRADIENTS);

function getGradient(muscles: string[]): [string, string] {
  for (const m of muscles) {
    const g = MUSCLE_GRADIENTS[m.toLowerCase()];
    if (g) return g;
  }
  const name = (muscles[0] ?? "").toLowerCase();
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return ALL_GRADIENTS[Math.abs(h) % ALL_GRADIENTS.length] ?? ["#5b7cf8", "#818cf8"];
}

function getMuscleLabel(muscles: string[]) {
  const m = muscles[0];
  if (!m) return null;
  return m.charAt(0).toUpperCase() + m.slice(1).toLowerCase();
}

export default function DashboardPage() {
  const { supabase, user } = useAuth();
  const { startWorkout } = useWorkout();
  const router = useRouter();

  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [startingEmpty, setStartingEmpty] = useState(false);

  // 3-dots menu
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadRoutines();
  }, [user, supabase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function loadRoutines() {
    try {
      const { data } = await supabase
        .from("routines")
        .select("id, name, routine_exercises(id, sets_config, exercises(id, name, muscle_group))")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (data) {
        setRoutines(
          data.map((r: Record<string, unknown>) => {
            const res = (r.routine_exercises as Record<string, unknown>[]) ?? [];
            return {
              id: r.id as string,
              title: (r.name as string) ?? "Routine",
              exercises: res.map((re) => {
                const ex = (re.exercises as Record<string, unknown>) ?? {};
                return {
                  id: ex.id as string,
                  name: ex.name as string,
                  muscleGroups: parseMuscleGroup(ex.muscle_group as string),
                };
              }),
              totalSets: res.reduce((sum, re) => {
                const cfg = re.sets_config as unknown[] | null;
                return sum + (Array.isArray(cfg) ? cfg.length : 0);
              }, 0),
            };
          })
        );
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleStart(routineId: string) {
    setMenuOpenId(null);
    setStartingId(routineId);
    try {
      await startWorkout(routineId);
      router.push("/active");
    } finally {
      setStartingId(null);
    }
  }

  async function handleStartEmpty() {
    setStartingEmpty(true);
    try {
      await startWorkout();
      router.push("/active");
    } finally {
      setStartingEmpty(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await supabase.from("routine_exercises").delete().eq("routine_id", deleteId);
      const { error } = await supabase.from("routines").delete().eq("id", deleteId);
      if (error) throw error;
      setRoutines((prev) => prev.filter((r) => r.id !== deleteId));
    } catch {
      alert("Failed to delete routine. Please try again.");
    } finally {
      setDeleteLoading(false);
      setDeleteId(null);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>My Routines</h1>
        <Link href="/routines/new" className={styles.newBtn} aria-label="New routine">+</Link>
      </header>

      <div className={styles.quickStart}>
        <button
          type="button"
          className={styles.emptyBtn}
          onClick={handleStartEmpty}
          disabled={startingEmpty}
        >
          <span className={styles.emptyBtnIcon}>▶</span>
          <span>{startingEmpty ? "Starting…" : "Start Empty Workout"}</span>
        </button>
      </div>

      {loading ? (
        <div className={styles.loading}><Spinner size={28} /></div>
      ) : routines.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>No routines yet</p>
          <p className={styles.emptySub}>Create your first routine to get started</p>
          <Link href="/routines/new" className={styles.createLink}>Create Routine</Link>
        </div>
      ) : (
        <div className={styles.grid} ref={menuRef}>
          {routines.map((r, i) => {
            const allMuscles = [...new Set(r.exercises.flatMap((e) => e.muscleGroups))];
            const [from, to] = getGradient(allMuscles);
            const muscleLabel = getMuscleLabel(allMuscles);
            return (
              <div
                key={r.id}
                className={styles.card}
                style={{ "--from": from, "--to": to, animationDelay: `${i * 50}ms` } as React.CSSProperties}
              >
                <div className={styles.cardGlow} />
                <div className={styles.cardBody}>
                  {/* Top row: link + 3-dots */}
                  <div className={styles.cardTopRow}>
                    <Link href={`/routines/${r.id}`} className={styles.cardLink} style={{ flex: 1 }}>
                      <h2 className={styles.cardTitle}>{r.title}</h2>
                      <div className={styles.cardMeta}>
                        <span>{r.exercises.length} exercise{r.exercises.length !== 1 ? "s" : ""}</span>
                        <span className={styles.metaDot}>·</span>
                        <span>{r.totalSets} sets</span>
                        {muscleLabel && (
                          <>
                            <span className={styles.metaDot}>·</span>
                            <span>{muscleLabel}</span>
                          </>
                        )}
                      </div>
                      {r.exercises.length > 0 && (
                        <div className={styles.pills}>
                          {r.exercises.slice(0, 3).map((e) => (
                            <span key={e.id} className={styles.pill}>{e.name}</span>
                          ))}
                          {r.exercises.length > 3 && (
                            <span className={styles.pillMore}>+{r.exercises.length - 3}</span>
                          )}
                        </div>
                      )}
                    </Link>

                    {/* 3-dots */}
                    <div className={styles.menuWrap}>
                      <button
                        type="button"
                        className={styles.more}
                        aria-label="More options"
                        onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === r.id ? null : r.id); }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="5" r="1.8" fill="currentColor"/>
                          <circle cx="12" cy="12" r="1.8" fill="currentColor"/>
                          <circle cx="12" cy="19" r="1.8" fill="currentColor"/>
                        </svg>
                      </button>
                      {menuOpenId === r.id && (
                        <div className={styles.dropdown}>
                          <button type="button" className={styles.dropItem}
                            onClick={() => { setMenuOpenId(null); router.push(`/routines/${r.id}/edit`); }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            Edit Routine
                          </button>
                          <button type="button" className={[styles.dropItem, styles.dropDanger].join(" ")}
                            onClick={() => { setMenuOpenId(null); setDeleteId(r.id); }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    className={styles.startBtn}
                    onClick={() => handleStart(r.id)}
                    disabled={startingId === r.id}
                    style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
                  >
                    {startingId === r.id ? "Starting…" : "▶ Start"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteId && (
        <div className={styles.modalOverlay} onClick={() => setDeleteId(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <p className={styles.modalTitle}>Delete Routine?</p>
            <p className={styles.modalText}>This will permanently delete the routine. This cannot be undone.</p>
            <div className={styles.modalActions}>
              <button type="button" className={styles.modalCancel} onClick={() => setDeleteId(null)}>Cancel</button>
              <button type="button" className={styles.modalDelete} onClick={handleDelete} disabled={deleteLoading}>
                {deleteLoading ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
