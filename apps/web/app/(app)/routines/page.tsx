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
  const { api } = useAuth();
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
        const [mine, lib] = await Promise.all([
          api.get<Routine[]>("/routines"),
          api.get<Routine[]>("/routines/library"),
        ]);
        setMyRoutines(mine);
        setLibrary(lib);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [api]);

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
      await api.post(`/routines/${routineId}/copy`, {});
      const res = await api.get<Routine[]>("/routines");
      setMyRoutines(res);
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
          <p className={styles.emptyIcon}>{tab === "mine" ? "📋" : "🏋️"}</p>
          <p className={styles.emptyTitle}>
            {tab === "mine" ? "No routines yet" : "No routines in library"}
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
