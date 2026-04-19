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
  setsConfig: Array<{ reps: number | null; weightKg: number | null }>;
}

interface Routine {
  id: string;
  title: string;
  exercises: RoutineExercise[];
  totalSets: number;
}

interface WorkoutInfo {
  lastDate: string | null;
  lastVolume: number;
  prevVolume: number; // -1 = no previous workout
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

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function ProgressRing({ lastVolume, prevVolume }: { lastVolume: number; prevVolume: number }) {
  const r = 13;
  const c = 2 * Math.PI * r;
  let pct = 1;
  let color = "rgba(26,21,16,0.18)";

  if (lastVolume > 0 && prevVolume < 0) {
    // First ever workout for this routine
    pct = 1;
    color = "#4a6ef5";
  } else if (lastVolume > 0 && prevVolume >= 0) {
    const ratio = prevVolume > 0 ? lastVolume / prevVolume : 1;
    pct = Math.min(ratio, 1);
    if (ratio >= 1) color = "#22a85a";       // improved — green
    else if (ratio >= 0.85) color = "#f59e0b"; // close — amber
    else color = "#ef4444";                    // dropped — red
  }

  const dash = (pct * c).toFixed(1);

  return (
    <svg width="34" height="34" viewBox="0 0 34 34" className={styles.ring}>
      <circle cx="17" cy="17" r={r} fill="none" stroke="rgba(26,21,16,0.08)" strokeWidth="3"/>
      <circle
        cx="17" cy="17" r={r} fill="none"
        stroke={color} strokeWidth="3"
        strokeDasharray={`${dash} ${c.toFixed(1)}`}
        strokeLinecap="round"
        transform="rotate(-90 17 17)"
        style={{ transition: "stroke-dasharray 0.45s ease" }}
      />
    </svg>
  );
}

export default function DashboardPage() {
  const { supabase, user } = useAuth();
  const { startWorkout } = useWorkout();
  const router = useRouter();

  const [routines, setRoutines] = useState<Routine[]>([]);
  const [workoutInfoMap, setWorkoutInfoMap] = useState<Map<string, WorkoutInfo>>(new Map());
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
        const mapped = data.map((r: Record<string, unknown>) => {
          const res = (r.routine_exercises as Record<string, unknown>[]) ?? [];
          return {
            id: r.id as string,
            title: (r.name as string) ?? "Routine",
            exercises: res.map((re) => {
              const ex = (re.exercises as Record<string, unknown>) ?? {};
              const cfg = re.sets_config as Array<Record<string, unknown>> | null;
              return {
                id: ex.id as string,
                name: ex.name as string,
                muscleGroups: parseMuscleGroup(ex.muscle_group as string),
                setsConfig: Array.isArray(cfg) && cfg.length > 0
                  ? cfg.map(s => ({ reps: (s.reps as number) ?? null, weightKg: (s.weight as number) ?? null }))
                  : Array.from({ length: 3 }, () => ({ reps: null, weightKg: null })),
              };
            }),
            totalSets: res.reduce((sum, re) => {
              const cfg = re.sets_config as unknown[] | null;
              return sum + (Array.isArray(cfg) ? cfg.length : 0);
            }, 0),
          };
        });

        setRoutines(mapped);

        // Fetch last 2 workouts per routine for last-performed + progress ring
        const routineIds = mapped.map((r) => r.id);
        if (routineIds.length > 0) {
          const { data: wData } = await supabase
            .from("workouts")
            .select("routine_id, started_at, total_volume")
            .in("routine_id", routineIds)
            .not("finished_at", "is", null)
            .order("started_at", { ascending: false });

          const byRoutine = new Map<string, Array<{ date: string; volume: number }>>();
          for (const w of (wData ?? []) as Record<string, unknown>[]) {
            const rid = w.routine_id as string;
            if (!rid) continue;
            if (!byRoutine.has(rid)) byRoutine.set(rid, []);
            byRoutine.get(rid)!.push({
              date: w.started_at as string,
              volume: (w.total_volume as number) ?? 0,
            });
          }

          const infoMap = new Map<string, WorkoutInfo>();
          for (const [rid, list] of byRoutine) {
            infoMap.set(rid, {
              lastDate: list[0]?.date ?? null,
              lastVolume: list[0]?.volume ?? 0,
              prevVolume: list.length > 1 ? (list[1]?.volume ?? 0) : -1,
            });
          }
          setWorkoutInfoMap(infoMap);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleStart(routineId: string, routine?: Routine) {
    setMenuOpenId(null);
    setStartingId(routineId);
    try {
      await startWorkout(routineId, routine ? {
        title: routine.title,
        exercises: routine.exercises.map(ex => ({
          exerciseId: ex.id,
          name: ex.name,
          muscleGroups: ex.muscleGroups,
          setsConfig: ex.setsConfig,
        })),
      } : undefined);
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
            const info = workoutInfoMap.get(r.id) ?? null;
            return (
              <div
                key={r.id}
                className={styles.card}
                style={{ "--from": from, "--to": to, animationDelay: `${i * 50}ms` } as React.CSSProperties}
              >
                <div className={styles.cardGlow} />
                <div className={styles.cardBody}>
                  {/* Top row: content + ring + 3-dots */}
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
                      {info?.lastDate && (
                        <p className={styles.lastPerformed}>
                          Last: {relativeDate(info.lastDate)}
                        </p>
                      )}
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

                    {/* Right column: ring + 3-dots */}
                    <div className={styles.cardRight}>
                      {info && (
                        <ProgressRing lastVolume={info.lastVolume} prevVolume={info.prevVolume} />
                      )}
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
                  </div>

                  <button
                    type="button"
                    className={styles.startBtn}
                    onClick={() => handleStart(r.id, r)}
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

      {/* ── FAB: Start Empty Workout ── */}
      <button
        type="button"
        className={styles.fab}
        onClick={handleStartEmpty}
        disabled={startingEmpty}
        aria-label="Start empty workout"
        title="Start Empty Workout"
      >
        {startingEmpty ? (
          <Spinner size={22} />
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M6 4l14 8-14 8V4z" fill="#fff"/>
          </svg>
        )}
      </button>

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
