"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkout } from "@/contexts/WorkoutContext";
import { Button } from "@/components/ui/Button/Button";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import { AiRoutineModal } from "@/components/workout/AiRoutineModal/AiRoutineModal";
import type { Routine } from "@/types/api";
import { parseMuscleGroup } from "@/lib/formatters";
import styles from "./page.module.css";

const MUSCLE_COLORS: Record<string, string> = {
  chest: "#e05c5c", back: "#3a9bdc", shoulders: "#9b7fe8",
  biceps: "#e8a23a", triceps: "#e87a3a", legs: "#4caf7d",
  quads: "#4caf7d", hamstrings: "#4caf7d", glutes: "#4caf7d",
  calves: "#4caf7d", abs: "#f5c518", core: "#f5c518",
  cardio: "#34d399", forearms: "#e8a23a", traps: "#3a9bdc", lats: "#3a9bdc",
};

function getMuscleColor(muscles: string[]): string {
  if (!muscles.length) return "#5e6272";
  return MUSCLE_COLORS[(muscles[0] ?? "").toLowerCase()] ?? "#5e6272";
}

export default function RoutinesPage() {
  const { supabase, user } = useAuth();
  const { startWorkout } = useWorkout();
  const router = useRouter();

  const [myRoutines, setMyRoutines] = useState<Routine[]>([]);
  const [library, setLibrary] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [startingEmpty, setStartingEmpty] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);

  // 3-dots menu
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Rename modal
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [renameLoading, setRenameLoading] = useState(false);

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // AI Coach modal
  const [aiOpen, setAiOpen] = useState(false);

  useEffect(() => {
    if (user) load();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function load() {
    setLoading(true);
    try {
      const mine = await supabase
        .from("routines")
        .select("id, name, description, user_id, created_at, folder_id, routine_exercises(id, exercise_id, \"order\", sets_config, exercises(id, name, muscle_group))")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      setMyRoutines((mine.data ?? []).map(mapRoutine));
    } finally {
      setLoading(false);
    }
  }

  async function loadLibrary() {
    const lib = await supabase
      .from("routines")
      .select("id, name, description, user_id, created_at, folder_id, routine_exercises(id, exercise_id, \"order\", sets_config, exercises(id, name, muscle_group))")
      .neq("user_id", user!.id);
    setLibrary(lib.error ? [] : (lib.data ?? []).map(mapRoutine));
  }

  async function handleStart(routineId: string, routine?: Routine) {
    setMenuOpenId(null);
    setStartingId(routineId);
    try {
      await startWorkout(routineId, routine ? {
        title: routine.title,
        exercises: routine.routineExercises.map(re => ({
          exerciseId: re.exercise.id,
          name: re.exercise.name,
          muscleGroups: re.exercise.muscleGroups,
          setsConfig: re.setsConfig.length > 0
            ? re.setsConfig.map(s => ({ reps: s.reps ?? null, weightKg: s.weightKg ?? null }))
            : Array.from({ length: 3 }, () => ({ reps: null, weightKg: null })),
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

  async function handleCopy(routineId: string) {
    try {
      const { data: src } = await supabase
        .from("routines")
        .select("*, routine_exercises(*, exercises(*))")
        .eq("id", routineId)
        .single();
      if (!src) return;

      const { data: newRoutine, error } = await supabase
        .from("routines")
        .insert({ user_id: user?.id, name: ((src.name as string) ?? "Routine"), description: src.description ?? null })
        .select()
        .single();

      if (error || !newRoutine) throw new Error(error?.message ?? "Failed to copy");

      const res = (src.routine_exercises as Record<string, unknown>[]) ?? [];
      if (res.length > 0) {
        await supabase.from("routine_exercises").insert(
          res.map((re, i) => ({
            routine_id: newRoutine.id,
            exercise_id: re.exercise_id,
            order_index: ((re.order_index ?? re["order"]) ?? i) as number,
            sets_config: (re.sets_config ?? []) as unknown[],
          }))
        );
      }

      await load();
      setShowLibrary(false);
    } catch {
      alert("Failed to copy routine");
    }
  }

  async function handleRename() {
    if (!renameId || !renameDraft.trim()) return;
    setRenameLoading(true);
    try {
      await supabase
        .from("routines")
        .update({ name: renameDraft.trim() })
        .eq("id", renameId);
      setMyRoutines((prev) =>
        prev.map((r) => (r.id === renameId ? { ...r, title: renameDraft.trim() } : r))
      );
    } finally {
      setRenameLoading(false);
      setRenameId(null);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await supabase.from("routine_exercises").delete().eq("routine_id", deleteId);
      const { error } = await supabase.from("routines").delete().eq("id", deleteId);
      if (error) throw error;
      setMyRoutines((prev) => prev.filter((r) => r.id !== deleteId));
    } catch {
      alert("Failed to delete routine. Please try again.");
    } finally {
      setDeleteLoading(false);
      setDeleteId(null);
    }
  }

  const displayed = showLibrary ? library : myRoutines;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Workout</h1>
      </header>

      <section className={styles.content}>
        <button type="button" className={styles.startEmpty} onClick={handleStartEmpty} disabled={startingEmpty}>
          <span className={styles.plus}>+</span>
          <span>{startingEmpty ? "Starting…" : "Start Empty Workout"}</span>
        </button>

        <div className={styles.sectionHead}>
          <h2>Routines</h2>
          <Link href="/routines/new" className={styles.addBtn} aria-label="New routine">+</Link>
        </div>

        <div className={styles.quick}>
          <Link href="/routines/new" className={styles.quickCard}>New Routine</Link>
          <button type="button" className={styles.quickCard} onClick={() => { setShowLibrary(true); if (library.length === 0) loadLibrary(); }}>Explore</button>
          <button type="button" className={`${styles.quickCard} ${styles.aiCard}`} onClick={() => setAiOpen(true)}>
            ✨ Build with AI
          </button>
        </div>

        <div className={styles.mineHead}>
          {showLibrary ? (
            <button type="button" className={styles.backMineInline} onClick={() => setShowLibrary(false)}>
              ← My Routines ({myRoutines.length})
            </button>
          ) : (
            <span>My Routines ({myRoutines.length})</span>
          )}
        </div>
      </section>

      {loading ? (
        <div className={styles.loadingCenter}><Spinner size={28} /></div>
      ) : displayed.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>
            {showLibrary ? "No routines in library" : "No routines yet"}
          </p>
          <p className={styles.emptySub}>
            {showLibrary ? "No public routines available" : "Tap + to create your first routine"}
          </p>
        </div>
      ) : (
        <div className={styles.list} ref={menuRef}>
          {displayed.map((r) => (
            <div key={r.id} className={styles.card}>
              <div className={styles.cardTop}>
                <Link href={`/routines/${r.id}`} className={styles.cardLink}>
                  <h3 className={styles.cardTitle}>{r.title}</h3>
                  <p className={styles.cardDesc}>
                    {r.routineExercises.length === 0
                      ? "No exercises"
                      : r.routineExercises.map((re) => re.exercise.name).join(", ")}
                  </p>
                </Link>

              {/* 3-dots menu */}
              {!showLibrary && (
                <div className={styles.menuWrap}>
                  <button
                    type="button"
                    className={styles.more}
                    aria-label="More options"
                    onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === r.id ? null : r.id); }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="5" r="1.6" fill="currentColor" />
                      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
                      <circle cx="12" cy="19" r="1.6" fill="currentColor" />
                    </svg>
                  </button>
                  {menuOpenId === r.id && (
                    <div className={styles.dropdown}>
                      <button
                        type="button"
                        className={styles.dropItem}
                        onClick={() => { setMenuOpenId(null); handleStart(r.id, r); }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <polygon points="5,3 19,12 5,21" fill="currentColor" />
                        </svg>
                        Start Workout
                      </button>
                      <button
                        type="button"
                        className={styles.dropItem}
                        onClick={() => { setMenuOpenId(null); setRenameDraft(r.title); setRenameId(r.id); }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Edit Name
                      </button>
                      <button
                        type="button"
                        className={[styles.dropItem, styles.dropDanger].join(" ")}
                        onClick={() => { setMenuOpenId(null); setDeleteId(r.id); }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )}

              </div>{/* end cardTop */}

              {!showLibrary && (
                <button
                  type="button"
                  className={styles.startRoutineBtn}
                  onClick={() => handleStart(r.id, r)}
                  disabled={startingId === r.id}
                >
                  {startingId === r.id ? "Starting…" : "Start Routine"}
                </button>
              )}

              {showLibrary && (
                <div className={styles.cardActions}>
                  <Button variant="secondary" size="sm" onClick={() => handleCopy(r.id)} fullWidth>
                    Copy to My Routines
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Rename Modal */}
      {renameId && (
        <div className={styles.modalOverlay} onClick={() => setRenameId(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Edit Routine Name</h3>
            <input
              className={styles.modalInput}
              value={renameDraft}
              onChange={(e) => setRenameDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
              autoFocus
              placeholder="Routine name"
            />
            <div className={styles.modalActions}>
              <button type="button" className={styles.modalCancel} onClick={() => setRenameId(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={styles.modalSave}
                onClick={handleRename}
                disabled={renameLoading || !renameDraft.trim()}
              >
                {renameLoading ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteId && (
        <div className={styles.modalOverlay} onClick={() => setDeleteId(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Delete Routine?</h3>
            <p className={styles.modalText}>This cannot be undone.</p>
            <div className={styles.modalActions}>
              <button type="button" className={styles.modalCancel} onClick={() => setDeleteId(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={styles.modalDelete}
                onClick={handleDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <AiRoutineModal
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        onCreated={() => { load(); }}
      />
    </div>
  );
}

function mapRoutine(row: Record<string, unknown>): Routine {
  const res = (row.routine_exercises as Record<string, unknown>[]) ?? [];
  return {
    id: row.id as string,
    userId: (row.user_id as string) ?? null,
    title: ((row.name as string) ?? (row.title as string) ?? "Routine"),
    description: (row.description as string) ?? null,
    folderId: (row.folder_id as string) ?? null,
    isPublic: false,
    createdAt: row.created_at as string,
    updatedAt: "",
    folder: null,
    routineExercises: res.map((re) => {
      const ex = (re.exercises as Record<string, unknown>) ?? {};
      return {
        id: re.id as string,
        routineId: re.routine_id as string,
        exerciseId: re.exercise_id as string,
        order: (re.order_index ?? re.order ?? 0) as number,
        setsConfig: [],
        exercise: {
          id: ex.id as string,
          name: ex.name as string,
          muscleGroups: parseMuscleGroup(ex.muscle_group),
          equipment: (ex.equipment as string) ?? null,
          instructions: (ex.instructions as string) ?? null,
          videoUrl: null,
          isCustom: (ex.is_custom as boolean) ?? false,
          createdByUserId: (ex.user_id as string) ?? null,
        },
      };
    }),
  };
}
