"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { TopBar } from "@/components/layout/TopBar/TopBar";
import styles from "./page.module.css";

const DAYS = [
  { code: "MON", full: "Monday",    color: "#5B9CF5" },
  { code: "TUE", full: "Tuesday",   color: "#9B7BF4" },
  { code: "WED", full: "Wednesday", color: "#3DD68C" },
  { code: "THU", full: "Thursday",  color: "#D4A843" },
  { code: "FRI", full: "Friday",    color: "#F06060" },
  { code: "SAT", full: "Saturday",  color: "#ec4899" },
  { code: "SUN", full: "Sunday",    color: "#E8C56D" },
];

export default function NewRoutinePage() {
  const { supabase, user } = useAuth();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  async function handleCreate(name?: string) {
    const finalTitle = (name ?? title).trim();
    setError("");
    if (!finalTitle) { setError("Name your routine first"); return; }
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

  const trimmed = title.trim();
  const ctaLabel = trimmed
    ? `✦  Create "${trimmed.length > 18 ? trimmed.slice(0, 18) + "…" : trimmed}"`
    : "✦  Create Routine";

  return (
    <div className={styles.page}>
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
            disabled={loading || !trimmed}
          >
            {loading ? "Creating…" : "Create →"}
          </button>
        }
      />

      <div className={styles.content}>
        {/* Hero glass card */}
        <div className={styles.heroCard}>
          <div className={styles.heroShimmer} />
          <div className={styles.heroIconWrap}>
            <div className={styles.heroIcon}>
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
                <rect x="2.5" y="9.5" width="3" height="5" rx="1.5" fill="var(--accent)" opacity="0.9" />
                <rect x="18.5" y="9.5" width="3" height="5" rx="1.5" fill="var(--accent)" opacity="0.9" />
                <rect x="5.5" y="10.5" width="13" height="3" rx="1.5" fill="var(--accent)" opacity="0.7" />
                <rect x="1" y="10" width="2" height="4" rx="1" fill="var(--accent)" opacity="0.4" />
                <rect x="21" y="10" width="2" height="4" rx="1" fill="var(--accent)" opacity="0.4" />
              </svg>
            </div>
          </div>
          <p className={styles.heroKicker}>CREATE ROUTINE</p>
          <h1 className={styles.heroTitle}>
            Build your<br />
            <em className={styles.heroHighlight}>workout plan</em>
          </h1>
          <p className={styles.heroSub}>
            Name it &middot; Pick exercises &middot; Set reps<br />then go lift.
          </p>
          <div className={styles.heroBars}>
            {[8, 14, 20, 14, 8].map((h, i) => (
              <div key={i} className={styles.heroBar} style={{ height: h }} />
            ))}
          </div>
        </div>

        {/* Name input glass card */}
        <div className={styles.nameCard}>
          <label className={styles.nameLabel}>Routine Name</label>
          <input
            className={styles.nameInput}
            value={title}
            onChange={(e) => { setTitle(e.target.value); setError(""); setSelectedDay(null); }}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="e.g. Push Day A, Leg Destroyer…"
            autoFocus
          />
          {title && <div className={styles.goldBar} />}
          {error && <p className={styles.error}>{error}</p>}
        </div>

        {/* Day picker */}
        <p className={styles.dayPickerLabel}>Or pick a day</p>
        <div className={styles.dayGrid}>
          {DAYS.map((d) => {
            const sel = selectedDay === d.code;
            return (
              <button
                key={d.code}
                type="button"
                className={`${styles.dayBtn} ${sel ? styles.dayBtnSelected : ""}`}
                style={{
                  "--day-color": d.color,
                  borderColor: sel ? `${d.color}66` : undefined,
                  background: sel ? `${d.color}18` : undefined,
                } as React.CSSProperties}
                onClick={() => { setSelectedDay(d.code); setTitle(d.full); setError(""); }}
                disabled={loading}
              >
                <div
                  className={styles.dayBtnInner}
                  style={{
                    background: `${d.color}${sel ? "25" : "14"}`,
                    borderColor: `${d.color}${sel ? "55" : "28"}`,
                    color: d.color,
                    boxShadow: sel ? `0 0 12px ${d.color}30` : "none",
                  }}
                >
                  {d.code}
                </div>
                <span
                  className={styles.dayBtnLabel}
                  style={{ color: sel ? d.color : undefined }}
                >
                  {d.full.slice(0, 3)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Main CTA */}
        <button
          type="button"
          className={styles.createCard}
          onClick={() => handleCreate()}
          disabled={loading || !trimmed}
        >
          <span className={styles.createCardShimmer} />
          {loading ? "Creating…" : ctaLabel}
        </button>
      </div>
    </div>
  );
}
