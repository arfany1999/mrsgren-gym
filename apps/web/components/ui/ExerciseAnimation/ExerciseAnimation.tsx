"use client";

import styles from "./ExerciseAnimation.module.css";

interface Props {
  name: string;
  muscles: string[];
  variant?: "full" | "thumb";
}

const MUSCLE_GRADIENTS: Record<string, [string, string]> = {
  chest:       ["#e05c5c", "#f97316"],
  lats:        ["#5b7cf8", "#818cf8"],
  back:        ["#5b7cf8", "#818cf8"],
  shoulders:   ["#a78bfa", "#c084fc"],
  biceps:      ["#f59e0b", "#fbbf24"],
  triceps:     ["#f97316", "#fb923c"],
  quadriceps:  ["#10b981", "#34d399"],
  quads:       ["#10b981", "#34d399"],
  hamstrings:  ["#059669", "#10b981"],
  glutes:      ["#0d9488", "#14b8a6"],
  calves:      ["#0891b2", "#22d3ee"],
  abdominals:  ["#eab308", "#fde047"],
  abs:         ["#eab308", "#fde047"],
  core:        ["#eab308", "#fde047"],
  traps:       ["#6366f1", "#818cf8"],
  forearms:    ["#d97706", "#f59e0b"],
  cardio:      ["#ec4899", "#f472b6"],
};

function getMuscleGradient(muscles: string[]): [string, string] {
  for (const m of muscles) {
    const key = m.toLowerCase();
    if (MUSCLE_GRADIENTS[key]) return MUSCLE_GRADIENTS[key];
  }
  // hash the first muscle name for a consistent colour
  const name = (muscles[0] ?? "").toLowerCase();
  const all = Object.values(MUSCLE_GRADIENTS);
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return all[Math.abs(h) % all.length] ?? ["#5b7cf8", "#818cf8"];
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "EX";
  if (words.length === 1) return (words[0] ?? "").substring(0, 2).toUpperCase();
  return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase();
}

function getMuscleLabel(muscles: string[]): string {
  if (!muscles.length) return "";
  const m = muscles[0] ?? "";
  return m.charAt(0).toUpperCase() + m.slice(1).toLowerCase();
}

export function ExerciseAnimation({ name, muscles, variant = "full" }: Props) {
  const [from, to] = getMuscleGradient(muscles);
  const initials = getInitials(name);
  const muscleLabel = getMuscleLabel(muscles);

  if (variant === "thumb") {
    return (
      <div
        className={styles.thumb}
        style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
        aria-label={name}
      >
        <span className={styles.thumbInitials}>{initials}</span>
      </div>
    );
  }

  // full variant — hero card for exercise detail page
  return (
    <div className={styles.full} style={{ "--from": from, "--to": to } as React.CSSProperties}>
      <div className={styles.fullGlow} />
      <div className={styles.fullContent}>
        <span className={styles.fullInitials}>{initials}</span>
        <p className={styles.fullName}>{name}</p>
        {muscleLabel && (
          <span
            className={styles.fullMuscle}
            style={{ background: `${from}26`, color: from, border: `1px solid ${from}40` }}
          >
            {muscleLabel}
          </span>
        )}
      </div>
    </div>
  );
}
