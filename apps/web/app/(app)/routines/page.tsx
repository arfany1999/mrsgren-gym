"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkout } from "@/contexts/WorkoutContext";
import { TopBar } from "@/components/layout/TopBar/TopBar";
import { Button } from "@/components/ui/Button/Button";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import type { Routine } from "@/types/api";
import styles from "./page.module.css";

type Tab = "mine" | "library";

export default function RoutinesPage() {
  const { supabase, user, profile } = useAuth();
  const { startWorkout } = useWorkout();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("mine");
  const [myRoutines, setMyRoutines] = useState<Routine[]>([]);
  const [library, setLibrary] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingId, setStartingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const mine = await supabase
          .from("routines")
          .select("*, routine_exercises(*, exercises(*))")
          .eq("user_id", user?.id ?? "")
          .order("created_at", { ascending: false });

        const lib = await supabase
          .from("routines")
          .select("*, routine_exercises(*, exercises(*))")
          .eq("is_public", true)
          .neq("user_id", user?.id ?? "");

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

  async function handleCopy(routineId: string) {
    try {
      // Fetch the routine to copy
      const { data: src } = await supabase
        .from("routines")
        .select("*, routine_exercises(*, exercises(*))")
        .eq("id", routineId)
        .single();
      if (!src) return;

      // Create a copy
      const baseTitle = (src.title as string) ?? (src.name as string) ?? "Routine";
      const candidateUserIds = [profile?.id, user?.id].filter(
        (v, i, arr): v is string => Boolean(v) && arr.indexOf(v) === i
      );
      let newRoutine: { id: string } | null = null;
      let lastErr: string | null = null;

      for (const candidateUserId of candidateUserIds) {
        const { data: byTitle, error: byTitleErr } = await supabase
          .from("routines")
          .insert({
            user_id: candidateUserId,
            title: baseTitle,
            description: src.description,
          })
          .select()
          .single();

        if (byTitle?.id) {
          newRoutine = byTitle;
          break;
        }

        const missingTitleColumn = Boolean(
          byTitleErr?.message?.includes("title") && byTitleErr?.message?.includes("schema cache")
        );
        const userFkError = Boolean(byTitleErr?.message?.includes("routines_user_id_fkey"));
        lastErr = byTitleErr?.message ?? lastErr;

        if (missingTitleColumn) {
          const { data: byName, error: byNameErr } = await supabase
            .from("routines")
            .insert({
              user_id: candidateUserId,
              name: baseTitle,
              description: src.description,
            })
            .select()
            .single();

          if (byName?.id) {
            newRoutine = byName;
            break;
          }

          const userFkErrorOnName = Boolean(byNameErr?.message?.includes("routines_user_id_fkey"));
          lastErr = byNameErr?.message ?? lastErr;
          if (userFkError || userFkErrorOnName) {
            continue;
          }
        } else if (userFkError) {
          continue;
        }
      }

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
      const { data: refreshed } = await supabase
        .from("routines")
        .select("*, routine_exercises(*, exercises(*))")
        .eq("user_id", user?.id ?? "")
        .order("created_at", { ascending: false });
      setMyRoutines((refreshed ?? []).map(mapRoutine));
      setTab("mine");
    } catch {
      alert("Failed to copy routine");
    }
  }

  const displayed = tab === "mine" ? myRoutines : library;

  return (
    <div className={styles.page}>
      <TopBar
        title="Routines"
        rightAction={
          <Link href="/routines/new" className={styles.addBtn}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </Link>
        }
      />

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={[styles.tab, tab === "mine" ? styles.activeTab : ""].join(" ")}
          onClick={() => setTab("mine")}
          type="button"
        >
          My Routines
        </button>
        <button
          className={[styles.tab, tab === "library" ? styles.activeTab : ""].join(" ")}
          onClick={() => setTab("library")}
          type="button"
        >
          Library
        </button>
      </div>

      {loading ? (
        <div className={styles.loadingCenter}><Spinner size={28} /></div>
      ) : displayed.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIconWrap}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
              <rect x="4" y="3" width="16" height="18" rx="2" stroke="var(--text-tertiary)" strokeWidth="1.6" />
              <path d="M8 8h8M8 12h8M8 16h5" stroke="var(--text-tertiary)" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </div>
          <p className={styles.emptyTitle}>
            {tab === "mine" ? "No routines yet" : "No routines in library"}
          </p>
          <p className={styles.emptySub}>
            {tab === "mine" ? "Create a routine to plan your workouts" : "No public routines available"}
          </p>
          {tab === "mine" && (
            <Link href="/routines/new">
              <Button variant="primary" size="sm">Create Routine</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className={styles.list}>
          {displayed.map((r) => (
            <div key={r.id} className={styles.card}>
              <Link href={`/routines/${r.id}`} className={styles.cardLink}>
                <h3 className={styles.cardTitle}>{r.title}</h3>
                {r.description && <p className={styles.cardDesc}>{r.description}</p>}
                <p className={styles.cardMeta}>
                  {r.routineExercises.length} exercise{r.routineExercises.length !== 1 ? "s" : ""}
                  {r.routineExercises.length > 0 && (
                    <span> · {r.routineExercises.slice(0, 3).map((re) => re.exercise.name).join(", ")}
                      {r.routineExercises.length > 3 && ` +${r.routineExercises.length - 3}`}
                    </span>
                  )}
                </p>
              </Link>

              <div className={styles.cardActions}>
                {tab === "mine" ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleStart(r.id)}
                    loading={startingId === r.id}
                  >
                    Start
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
