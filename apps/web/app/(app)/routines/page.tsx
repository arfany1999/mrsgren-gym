"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkout } from "@/contexts/WorkoutContext";
import { Button } from "@/components/ui/Button/Button";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import type { Routine } from "@/types/api";
import styles from "./page.module.css";

type Tab = "mine" | "library";

export default function RoutinesPage() {
  const { supabase, user } = useAuth();
  const { startWorkout } = useWorkout();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("mine");
  const [myRoutines, setMyRoutines] = useState<Routine[]>([]);
  const [library, setLibrary] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [startingEmpty, setStartingEmpty] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const ownerIds = await resolveCandidateUserIds();
        const mineFilterIds = ownerIds.length > 0 ? ownerIds : [user?.id ?? ""];
        const mine = await supabase
          .from("routines")
          .select("*, routine_exercises(*, exercises(*))")
          .in("user_id", mineFilterIds)
          .order("created_at", { ascending: false });

        const mineExclusion = mineFilterIds.filter(Boolean);
        const libQuery = supabase
          .from("routines")
          .select("*, routine_exercises(*, exercises(*))")
          .eq("is_public", true);
        const lib = mineExclusion.length
          ? await libQuery.not("user_id", "in", `(${mineExclusion.map((id) => `"${id}"`).join(",")})`)
          : await libQuery;

        const missingPublicColumn = Boolean(
          lib.error?.message?.includes("is_public") || lib.error?.message?.includes("schema cache")
        );

        setMyRoutines((mine.data ?? []).map(mapRoutine));
        setLibrary(missingPublicColumn ? [] : (lib.data ?? []).map(mapRoutine));
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    if (user) load();
  }, [supabase, user]);

  async function handleStart(routineId: string) {
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

  async function handleCopy(routineId: string) {
    try {
      await ensureOwnUserRow();
      // Fetch the routine to copy
      const { data: src } = await supabase
        .from("routines")
        .select("*, routine_exercises(*, exercises(*))")
        .eq("id", routineId)
        .single();
      if (!src) return;

      // Create a copy
      const baseTitle = (src.name as string) ?? (src.title as string) ?? "Routine";
      const { routine: newRoutine, lastErr } = await createRoutine(
        baseTitle,
        (src.description as string) ?? null
      );

      if (!newRoutine) {
        throw new Error(lastErr ?? "Failed to copy routine");
      }

      if (newRoutine && src.routine_exercises?.length > 0) {
        await supabase.from("routine_exercises").insert(
          src.routine_exercises.map((re: Record<string, unknown>) => ({
            routine_id: newRoutine.id,
            exercise_id: re.exercise_id,
            order: re.order,
            sets_config: re.sets_config,
          }))
        );
      }

      // Refresh my routines
      const ownerIds = resolveCandidateUserIds();
      const { data: refreshed } = await supabase
        .from("routines")
        .select("*, routine_exercises(*, exercises(*))")
        .in("user_id", ownerIds)
        .order("created_at", { ascending: false });
      setMyRoutines((refreshed ?? []).map(mapRoutine));
      setTab("mine");
    } catch {
      alert("Failed to copy routine");
    }
  }

  const displayed = tab === "mine" ? myRoutines : library;

  function resolveCandidateUserIds() {
    return [user?.id ?? ""].filter(Boolean);
  }

  async function ensureOwnUserRow() {
    if (!user?.id) return;
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    await supabase.from("users").upsert(
      {
        id: user.id,
        email: user.email ?? "",
        name:
          (meta.name as string) ||
          (meta.full_name as string) ||
          user.email?.split("@")[0] ||
          "Athlete",
        username: (meta.username as string) || user.email?.split("@")[0] || null,
      },
      { onConflict: "id" }
    );
  }

  async function createRoutine(
    routineTitle: string,
    routineDescription: string | null
  ) {
    const { data: routine, error } = await supabase
      .from("routines")
      .insert({ user_id: user?.id, name: routineTitle, description: routineDescription })
      .select()
      .single();
    return { routine: routine ?? null, lastErr: error?.message ?? null };
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headLeft}>
          <h1 className={styles.title}>Workout</h1>
          <button type="button" className={styles.chevBtn} aria-label="Workout menu">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M6 9l6 6 6-6" stroke="var(--text-primary)" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <span className={styles.pro}>PRO</span>
      </header>

      <section className={styles.content}>
        <button type="button" className={styles.startEmpty} onClick={handleStartEmpty} disabled={startingEmpty}>
          <span className={styles.plus}>+</span>
          <span>Start Empty Workout</span>
        </button>

        <div className={styles.sectionHead}>
          <h2>Routines</h2>
          <Link href="/routines/new" className={styles.addBtn} aria-label="New routine">
            +
          </Link>
        </div>

        <div className={styles.quick}>
          <Link href="/routines/new" className={styles.quickCard}>
            New Routine
          </Link>
          <button type="button" className={styles.quickCard} onClick={() => setTab("library")}>
            Explore
          </button>
        </div>

        <div className={styles.tip}>Press and hold a routine to reorder</div>

        <div className={styles.mineHead}>
          <span>My Routines ({myRoutines.length})</span>
        </div>
      </section>

      {loading ? (
        <div className={styles.loadingCenter}><Spinner size={28} /></div>
      ) : displayed.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>
            {tab === "mine" ? "No routines yet" : "No routines in library"}
          </p>
          <p className={styles.emptySub}>
            {tab === "mine" ? "Create a routine to plan your workouts" : "No public routines available"}
          </p>
        </div>
      ) : (
        <div className={styles.list}>
          {displayed.map((r) => (
            <div key={r.id} className={styles.card}>
              <Link href={`/routines/${r.id}`} className={styles.cardLink}>
                <h3 className={styles.cardTitle}>{r.title}</h3>
                <p className={styles.cardDesc}>
                  {r.routineExercises.slice(0, 3).map((re) => re.exercise.name).join(", ")}
                  {r.routineExercises.length > 3 ? "..." : ""}
                </p>
              </Link>
              <button type="button" className={styles.more} aria-label="More options">...</button>
              <div className={styles.cardActions}>
                {tab === "mine" ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleStart(r.id)}
                    loading={startingId === r.id}
                  >
                    Start Routine
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleCopy(r.id)}
                  >
                    Copy
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "library" && (
        <div className={styles.backMineWrap}>
          <button type="button" onClick={() => setTab("mine")} className={styles.backMine}>
            Back to My Routines
          </button>
        </div>
      )}
    </div>
  );
}

function mapRoutine(row: Record<string, unknown>): Routine {
  const res = (row.routine_exercises as Record<string, unknown>[]) ?? [];
  return {
    id: row.id as string,
    userId: (row.user_id as string) ?? null,
    title: ((row.title as string) ?? (row.name as string) ?? "Routine"),
    description: (row.description as string) ?? null,
    folderId: (row.folder_id as string) ?? null,
    isPublic: (row.is_public as boolean) ?? false,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    folder: null,
    routineExercises: res.map((re) => {
      const ex = (re.exercises as Record<string, unknown>) ?? {};
      return {
        id: re.id as string,
        routineId: re.routine_id as string,
        exerciseId: re.exercise_id as string,
        order: re.order as number,
        setsConfig: (re.sets_config as Routine["routineExercises"][0]["setsConfig"]) ?? [],
        exercise: {
          id: ex.id as string,
          name: ex.name as string,
          muscleGroups: (ex.muscle_groups as string[]) ?? [],
          equipment: (ex.equipment as string) ?? null,
          instructions: (ex.instructions as string) ?? null,
          videoUrl: (ex.video_url as string) ?? null,
          isCustom: (ex.is_custom as boolean) ?? false,
          createdByUserId: (ex.created_by_user_id as string) ?? null,
        },
      };
    }),
  };
}
