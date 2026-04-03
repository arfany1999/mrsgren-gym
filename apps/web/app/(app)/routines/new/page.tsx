"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { TopBar } from "@/components/layout/TopBar/TopBar";
import { Button } from "@/components/ui/Button/Button";
import styles from "./page.module.css";

export default function NewRoutinePage() {
  const { supabase, user } = useAuth();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    setError("");
    if (!title.trim()) { setError("Routine name is required"); return; }
    if (!user?.id) { setError("Please sign in again."); return; }

    setLoading(true);
    try {
      const { data: routine, error: routineErr } = await supabase
        .from("routines")
        .insert({ user_id: user.id, name: title.trim() })
        .select()
        .single();

      if (routineErr || !routine) throw new Error(routineErr?.message ?? "Failed to create routine");

      // Go straight to edit page, just like Hevy
      router.replace(`/routines/${routine.id as string}/edit`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create routine");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <TopBar
        title="New Routine"
        showBack
        rightAction={
          <button
            type="button"
            className={styles.createBtn}
            onClick={handleCreate}
            disabled={loading || !title.trim()}
          >
            {loading ? "Creating…" : "Create"}
          </button>
        }
      />

      <div className={styles.content}>
        <div className={styles.nameWrap}>
          <label className={styles.nameLabel}>Routine Title</label>
          <input
            className={styles.nameInput}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="e.g. Push Day A"
            autoFocus
          />
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <Button fullWidth size="lg" onClick={handleCreate} loading={loading} disabled={!title.trim()}>
          Create Routine
        </Button>
      </div>
    </div>
  );
}
