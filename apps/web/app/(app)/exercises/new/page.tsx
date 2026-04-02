"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { TopBar } from "@/components/layout/TopBar/TopBar";
import { Input } from "@/components/ui/Input/Input";
import { Button } from "@/components/ui/Button/Button";
import styles from "./page.module.css";

const MUSCLE_OPTIONS = [
  "Chest", "Back", "Shoulders", "Biceps", "Triceps",
  "Forearms", "Core", "Glutes", "Quads", "Hamstrings", "Calves",
];

const EQUIPMENT_OPTIONS = [
  "Barbell", "Dumbbell", "Machine", "Cable", "Bodyweight",
  "Kettlebell", "Resistance Band", "Smith Machine", "Other",
];

export default function NewExercisePage() {
  const { supabase, user } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [muscleGroups, setMuscleGroups] = useState<string[]>([]);
  const [equipment, setEquipment] = useState("");
  const [instructions, setInstructions] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function toggleMuscle(m: string) {
    setMuscleGroups((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim()) { setError("Exercise name is required"); return; }
    if (muscleGroups.length === 0) { setError("Select at least one muscle group"); return; }

    setLoading(true);
    try {
      const { error: dbError } = await supabase.from("exercises").insert({
        name: name.trim(),
        muscle_groups: muscleGroups,
        equipment: equipment || null,
        instructions: instructions || null,
        is_custom: true,
        created_by_user_id: user?.id ?? null,
      });
      if (dbError) throw new Error(dbError.message);
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create exercise");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <TopBar title="New Exercise" showBack />

      <form className={styles.form} onSubmit={handleSubmit}>
        <Input
          label="Exercise Name"
          placeholder="e.g. Barbell Squat"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        {/* Muscle Groups */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Muscle Groups *</label>
          <div className={styles.chips}>
            {MUSCLE_OPTIONS.map((m) => (
              <button
                key={m}
                type="button"
                className={[styles.chip, muscleGroups.includes(m) ? styles.chipActive : ""].join(" ")}
                onClick={() => toggleMuscle(m)}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Equipment */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Equipment (optional)</label>
          <div className={styles.chips}>
            <button
              type="button"
              className={[styles.chip, equipment === "" ? styles.chipActive : ""].join(" ")}
              onClick={() => setEquipment("")}
            >
              None
            </button>
            {EQUIPMENT_OPTIONS.map((eq) => (
              <button
                key={eq}
                type="button"
                className={[styles.chip, equipment === eq ? styles.chipActive : ""].join(" ")}
                onClick={() => setEquipment(eq)}
              >
                {eq}
              </button>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Instructions (optional)</label>
          <textarea
            className={styles.textarea}
            placeholder="How to perform this exercise..."
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={4}
          />
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <Button type="submit" fullWidth size="lg" loading={loading}>
          Create Exercise
        </Button>
      </form>
    </div>
  );
}
