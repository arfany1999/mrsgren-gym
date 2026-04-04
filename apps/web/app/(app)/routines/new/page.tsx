"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { TopBar } from "@/components/layout/TopBar/TopBar";
import styles from "./page.module.css";

const QUICK_NAMES = [
  { icon: "💪", label: "Push Day" },
  { icon: "🏋️", label: "Pull Day" },
  { icon: "🦵", label: "Leg Day" },
  { icon: "🔥", label: "Full Body" },
  { icon: "🏃", label: "Cardio" },
  { icon: "🧘", label: "Core & Abs" },
];

export default function NewRoutinePage() {
  const { supabase, user } = useAuth();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate(name?: string) {
    const finalTitle = (name ?? title).trim();
    setError("");
    if (!finalTitle) { setError("Give your routine a name first"); return; }
    if (!user?.id) { setError("Please sign in again."); return; }

    setLoading(true);
    try {
      const { data: routine, error: routineErr } = await supabase
        .from("routines")
        .insert({ user_id: user.id, name: finalTitle })
        .select()
        .single();

      if (routineErr || !routine) throw new Error(routineErr?.message ?? "Failed to create routine");

      router.replace(`/routines/${routine.id as string}/edit`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create routine");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      {/* Background blobs */}
      <div className={styles.blob1} />
      <div className={styles.blob2} />

      <TopBar
        title="New Routine"
        showBack
        rightAction={
          <button
            type="button"
            className={styles.createBtn}
            onClick={() => handleCreate()}
            disabled={loading || !title.trim()}
          >
            {loading ? "Creating…" : "Create"}
          </button>
        }
      />

      <div className={styles.content}>
        {/* Hero */}
        <div className={styles.hero}>
          <div className={styles.heroRing}>🏋️</div>
          <h1 className={styles.heroTitle}>Name Your Routine</h1>
          <p className={styles.heroSub}>
            A great name keeps you motivated.<br />What are you training today?
          </p>
        </div>

        {/* Name input card */}
        <div className={styles.nameCard}>
          <label className={styles.nameLabel}>Routine Title</label>
          <input
            className={styles.nameInput}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="e.g. Push Day A, Leg Destroyer…"
            autoFocus
          />
        </div>

        {/* Quick-pick name chips */}
        <div className={styles.tips}>
          {QUICK_NAMES.map((t) => (
            <button
              key={t.label}
              type="button"
              className={styles.tip}
              onClick={() => { setTitle(t.label); handleCreate(t.label); }}
              disabled={loading}
            >
              <span className={styles.tipIcon}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {error && <p className={styles.error}>{error}</p>}

        {/* Main CTA */}
        <button
          type="button"
          className={styles.createCard}
          onClick={() => handleCreate()}
          disabled={loading || !title.trim()}
        >
          {loading ? "Creating…" : "✦ Create Routine"}
        </button>
      </div>
    </div>
  );
}
