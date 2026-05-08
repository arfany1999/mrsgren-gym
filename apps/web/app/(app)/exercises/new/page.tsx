"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { TopBar } from "@/components/layout/TopBar/TopBar";
import { BodyMuscleIcon } from "@/components/ui/BodyMuscleIcon/BodyMuscleIcon";
import styles from "./page.module.css";

const MUSCLE_OPTIONS = [
  "Chest", "Back", "Shoulders", "Biceps", "Triceps",
  "Forearms", "Core", "Glutes", "Quads", "Hamstrings", "Calves",
] as const;

type EquipmentId =
  | ""
  | "Barbell" | "Dumbbell" | "Machine" | "Cable"
  | "Bodyweight" | "Kettlebell" | "Resistance Band" | "Smith Machine" | "Other";

interface EquipmentDef {
  id: EquipmentId;
  label: string;
  short: string;
  icon: React.ReactNode;
}

// Hand-drawn line icons — same visual weight as the rest of the app.
// Stroke uses currentColor so the active state's gold flows through.
const EQUIPMENT_OPTIONS: EquipmentDef[] = [
  {
    id: "Barbell", label: "Barbell", short: "Bar",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
        <line x1="2" y1="12" x2="22" y2="12" />
        <line x1="4" y1="8" x2="4" y2="16" />
        <line x1="6" y1="6.5" x2="6" y2="17.5" />
        <line x1="18" y1="6.5" x2="18" y2="17.5" />
        <line x1="20" y1="8" x2="20" y2="16" />
      </svg>
    ),
  },
  {
    id: "Dumbbell", label: "Dumbbell", short: "DB",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
        <line x1="9" y1="12" x2="15" y2="12" />
        <line x1="6" y1="8" x2="6" y2="16" />
        <line x1="8" y1="6" x2="8" y2="18" />
        <line x1="16" y1="6" x2="16" y2="18" />
        <line x1="18" y1="8" x2="18" y2="16" />
      </svg>
    ),
  },
  {
    id: "Machine", label: "Machine", short: "Mach",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <line x1="4" y1="9" x2="20" y2="9" />
        <line x1="9" y1="13" x2="15" y2="13" />
        <line x1="9" y1="17" x2="15" y2="17" />
      </svg>
    ),
  },
  {
    id: "Cable", label: "Cable", short: "Cab",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="5" r="2" />
        <path d="M6 7 C 6 12, 18 12, 18 17" />
        <path d="M16 17 h4 v4 h-4 z" />
      </svg>
    ),
  },
  {
    id: "Bodyweight", label: "Bodyweight", short: "Body",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="5" r="2.5" />
        <path d="M12 8 v6" />
        <path d="M8 11 l4-1 l4 1" />
        <path d="M9 22 l3-7 l3 7" />
      </svg>
    ),
  },
  {
    id: "Kettlebell", label: "Kettlebell", short: "KB",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 6 a3 3 0 0 1 6 0" />
        <path d="M8 7 c-3 1 -4 5 -4 8 c0 4 4 6 8 6 c4 0 8 -2 8 -6 c0 -3 -1 -7 -4 -8 z" />
      </svg>
    ),
  },
  {
    id: "Resistance Band", label: "Band", short: "Band",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12 q 3 -6 6 0 t 6 0 t 6 0" />
      </svg>
    ),
  },
  {
    id: "Smith Machine", label: "Smith", short: "Smith",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="3" x2="5" y2="21" />
        <line x1="19" y1="3" x2="19" y2="21" />
        <rect x="6" y="11" width="12" height="2" />
        <line x1="2" y1="11" x2="6" y2="11" />
        <line x1="2" y1="13" x2="6" y2="13" />
        <line x1="18" y1="11" x2="22" y2="11" />
        <line x1="18" y1="13" x2="22" y2="13" />
      </svg>
    ),
  },
  {
    id: "Other", label: "Other", short: "Other",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
        <circle cx="6" cy="12" r="1.5" />
        <circle cx="12" cy="12" r="1.5" />
        <circle cx="18" cy="12" r="1.5" />
      </svg>
    ),
  },
];

const NAME_MAX = 60;
const NOTES_MAX = 600;

export default function NewExercisePage() {
  const { supabase, user } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [muscleGroups, setMuscleGroups] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<EquipmentId>("");
  const [instructions, setInstructions] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function toggleMuscle(m: string) {
    setMuscleGroups((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );
  }

  // Lowercased muscle list for the body diagram (the icon expects keys
  // like "chest", "lats", etc. — see BodyMuscleIcon's lookup table).
  const diagramMuscles = useMemo(
    () => muscleGroups.map((m) => m.toLowerCase()),
    [muscleGroups],
  );

  const equipmentDef = useMemo(
    () => EQUIPMENT_OPTIONS.find((e) => e.id === equipment) ?? null,
    [equipment],
  );

  const isValid = name.trim().length > 0 && muscleGroups.length > 0;
  const previewName = name.trim() || "Your exercise";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) { setError("Give the exercise a name first."); return; }
    if (muscleGroups.length === 0) { setError("Pick at least one targeted muscle."); return; }

    setLoading(true);
    try {
      const { error: dbError } = await supabase.from("exercises").insert({
        name: name.trim(),
        muscle_group: muscleGroups,
        equipment: equipment || null,
        instructions: instructions || null,
        is_custom: true,
        created_by_user_id: user?.id ?? null,
      });
      // Schema-cache rename hedge: if the migration moved the column to
      // `muscle_groups` in flight, drop the join data and just save the
      // name so the user isn't blocked.
      const missingMuscleGroupsColumn = Boolean(
        dbError?.message?.includes("muscle_groups") && dbError?.message?.includes("schema cache"),
      );
      if (dbError && !missingMuscleGroupsColumn) throw new Error(dbError.message);
      if (missingMuscleGroupsColumn) {
        const { error: fallbackErr } = await supabase.from("exercises").insert({
          name: name.trim(),
        });
        if (fallbackErr) throw new Error(fallbackErr.message);
      }
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create exercise");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <TopBar title="Custom Exercise" showBack />

      <form className={styles.form} onSubmit={handleSubmit}>
        {/* ── HERO PREVIEW ─────────────────────────────────────── */}
        {/* Live, gold-bordered card showing exactly what the user is
            building. The body diagram lights up as muscles are picked,
            and the display name + chips mirror what the exercise card
            will look like elsewhere in the app. */}
        <section className={styles.hero}>
          <div className={styles.heroGlow} aria-hidden />
          <div className={styles.heroBody}>
            <BodyMuscleIcon muscles={diagramMuscles} variant="full" />
          </div>
          <div className={styles.heroMeta}>
            <span className={styles.heroBadge}>Custom · Private</span>
            <h1
              className={[
                styles.heroName,
                name.trim() ? styles.heroNameSet : "",
              ].join(" ")}
            >
              {previewName}
            </h1>
            <div className={styles.heroTags}>
              {muscleGroups.length === 0 ? (
                <span className={styles.heroTagPlaceholder}>
                  Pick a muscle group below
                </span>
              ) : (
                muscleGroups.slice(0, 4).map((m) => (
                  <span key={m} className={styles.heroTag}>{m}</span>
                ))
              )}
              {muscleGroups.length > 4 && (
                <span className={styles.heroTagMore}>+{muscleGroups.length - 4}</span>
              )}
            </div>
            {equipmentDef && (
              <div className={styles.heroEquip}>
                <span className={styles.heroEquipIcon} aria-hidden>{equipmentDef.icon}</span>
                <span className={styles.heroEquipLabel}>{equipmentDef.label}</span>
              </div>
            )}
          </div>
        </section>

        {/* ── NAME ─────────────────────────────────────────────── */}
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionLabel}>Name</span>
            <span className={styles.sectionCount}>
              {name.length}/{NAME_MAX}
            </span>
          </div>
          <input
            className={styles.nameInput}
            type="text"
            value={name}
            maxLength={NAME_MAX}
            placeholder="e.g. Paused Pin Squat"
            onChange={(e) => setName(e.target.value)}
            spellCheck={false}
            autoComplete="off"
          />
          <p className={styles.sectionHint}>
            How it&apos;ll appear in your routines &amp; history.
          </p>
        </section>

        {/* ── MUSCLES ──────────────────────────────────────────── */}
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionLabel}>Targeted muscles</span>
            <span className={styles.sectionCount}>
              {muscleGroups.length} selected
            </span>
          </div>
          <div className={styles.muscleGrid}>
            {MUSCLE_OPTIONS.map((m) => {
              const active = muscleGroups.includes(m);
              return (
                <button
                  key={m}
                  type="button"
                  className={[
                    styles.muscleChip,
                    active ? styles.muscleChipActive : "",
                  ].join(" ")}
                  onClick={() => toggleMuscle(m)}
                  aria-pressed={active}
                >
                  {m}
                </button>
              );
            })}
          </div>
          <p className={styles.sectionHint}>
            The diagram above highlights what you pick. Tap again to clear.
          </p>
        </section>

        {/* ── EQUIPMENT ────────────────────────────────────────── */}
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionLabel}>Equipment</span>
            <span className={styles.sectionCount}>Optional</span>
          </div>
          <div className={styles.equipGrid}>
            <button
              type="button"
              className={[
                styles.equipTile,
                equipment === "" ? styles.equipTileActive : "",
              ].join(" ")}
              onClick={() => setEquipment("")}
              aria-pressed={equipment === ""}
            >
              <span className={styles.equipIcon} aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </span>
              <span className={styles.equipLabel}>None</span>
            </button>
            {EQUIPMENT_OPTIONS.map((eq) => (
              <button
                key={eq.id}
                type="button"
                className={[
                  styles.equipTile,
                  equipment === eq.id ? styles.equipTileActive : "",
                ].join(" ")}
                onClick={() => setEquipment(eq.id)}
                aria-pressed={equipment === eq.id}
              >
                <span className={styles.equipIcon} aria-hidden>{eq.icon}</span>
                <span className={styles.equipLabel}>{eq.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ── NOTES ────────────────────────────────────────────── */}
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionLabel}>Form notes</span>
            <span className={styles.sectionCount}>
              {instructions.length}/{NOTES_MAX}
            </span>
          </div>
          <textarea
            className={styles.textarea}
            value={instructions}
            maxLength={NOTES_MAX}
            placeholder={`Cues to remember next time. e.g.\n\nBrace, drive through the heels, pin set just above\nthe sticking point.`}
            onChange={(e) => setInstructions(e.target.value)}
            rows={4}
          />
        </section>

        {error && <p className={styles.error}>{error}</p>}

        {/* spacer for sticky bar so the last section isn't covered */}
        <div className={styles.actionsSpacer} aria-hidden />

        {/* ── STICKY ACTIONS ───────────────────────────────────── */}
        <div className={styles.actionsBar}>
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={!isValid || loading}
          >
            {loading ? (
              <>Saving…</>
            ) : isValid ? (
              <>Create &ldquo;{previewName}&rdquo;</>
            ) : (
              <>Add a name &amp; muscle</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
