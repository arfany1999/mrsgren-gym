"use client";

import { useRef } from "react";
import type { ActiveExercise } from "@/contexts/WorkoutContext";
import styles from "./WorkoutReport.module.css";

interface WorkoutReportProps {
  title: string;
  elapsedSeconds: number;
  exercises: ActiveExercise[];
  workoutId: string;
  onDone: (id: string) => void;
}

const HYPE = [
  "Well Done G! 💪",
  "Beast Mode: Unlocked 🔥",
  "You Crushed It! 🏆",
  "Another Day, Another Win ⚡",
  "That's What Champions Do! 🥇",
  "Keep Grinding! 💎",
];

function pickHype(id: string): string {
  const idx = id.charCodeAt(0) % HYPE.length;
  return HYPE[idx] ?? "Well Done! 💪";
}

function fmt(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function WorkoutReport({ title, elapsedSeconds, exercises, workoutId, onDone }: WorkoutReportProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const totalSets = exercises.reduce((n, e) => n + e.sets.filter((s) => s.isSaved).length, 0);
  const totalReps = exercises.reduce((n, e) => n + e.sets.filter((s) => s.isSaved).reduce((r, s) => r + (parseInt(s.reps) || 0), 0), 0);
  const totalVolume = exercises.reduce((n, e) =>
    n + e.sets.filter((s) => s.isSaved).reduce((v, s) => v + (parseFloat(s.weightKg) || 0) * (parseInt(s.reps) || 0), 0), 0
  );
  const hype = pickHype(workoutId);

  async function handleShare() {
    // Build a canvas image of the report card
    const card = cardRef.current;
    if (!card) return;

    const canvas = document.createElement("canvas");
    const scale = 2;
    canvas.width = 400 * scale;
    canvas.height = 520 * scale;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(scale, scale);

    // Background
    const grad = ctx.createLinearGradient(0, 0, 0, 520);
    grad.addColorStop(0, "#0d1117");
    grad.addColorStop(1, "#0a1929");
    ctx.fillStyle = grad;
    ctx.roundRect(0, 0, 400, 520, 20);
    ctx.fill();

    // Top accent bar
    ctx.fillStyle = "#34d399";
    ctx.roundRect(20, 20, 360, 4, 2);
    ctx.fill();

    // Hype text
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 28px -apple-system, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(hype, 200, 80);

    // Workout title
    ctx.fillStyle = "#94a3b8";
    ctx.font = "16px -apple-system, system-ui, sans-serif";
    ctx.fillText(title, 200, 112);

    // Divider
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, 130);
    ctx.lineTo(360, 130);
    ctx.stroke();

    // Stats
    const stats = [
      { label: "DURATION", value: fmt(elapsedSeconds) },
      { label: "EXERCISES", value: String(exercises.length) },
      { label: "SETS", value: String(totalSets) },
      { label: "REPS", value: String(totalReps) },
    ];
    const colW = 400 / stats.length;
    stats.forEach((stat, i) => {
      const x = colW * i + colW / 2;
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 26px -apple-system, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(stat.value, x, 185);
      ctx.fillStyle = "#64748b";
      ctx.font = "11px -apple-system, system-ui, sans-serif";
      ctx.fillText(stat.label, x, 205);
    });

    if (totalVolume > 0) {
      ctx.fillStyle = "#34d399";
      ctx.font = "bold 18px -apple-system, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${Math.round(totalVolume).toLocaleString()} kg total volume`, 200, 238);
    }

    // Exercise list
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(40, 255); ctx.lineTo(360, 255); ctx.stroke();

    let y = 280;
    exercises.slice(0, 5).forEach((ex) => {
      const saved = ex.sets.filter((s) => s.isSaved);
      if (saved.length === 0) return;
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "14px -apple-system, system-ui, sans-serif";
      ctx.textAlign = "left";
      const name = ex.name.length > 28 ? ex.name.slice(0, 27) + "…" : ex.name;
      ctx.fillText(name, 40, y);
      ctx.fillStyle = "#34d399";
      ctx.font = "bold 14px -apple-system, system-ui, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`${saved.length} sets`, 360, y);
      y += 28;
    });
    if (exercises.length > 5) {
      ctx.fillStyle = "#64748b";
      ctx.font = "12px -apple-system, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`+ ${exercises.length - 5} more exercises`, 200, y + 4);
      y += 28;
    }

    // Footer
    ctx.fillStyle = "#334155";
    ctx.font = "12px -apple-system, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Tracked with GYM • gym.mrgren.store", 200, 500);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], "workout.png", { type: "image/png" });
      try {
        if (navigator.share && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: hype,
            text: `${title} — ${fmt(elapsedSeconds)} | ${exercises.length} exercises | ${totalSets} sets`,
            files: [file],
          });
        } else if (navigator.share) {
          await navigator.share({
            title: hype,
            text: `${title} — ${fmt(elapsedSeconds)} | ${exercises.length} exercises | ${totalSets} sets\n\ngym.mrgren.store`,
          });
        } else {
          // Download fallback
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "workout.png";
          a.click();
          URL.revokeObjectURL(url);
        }
      } catch {
        // User cancelled share — that's fine
      }
    }, "image/png");
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.card} ref={cardRef}>
        <div className={styles.accentBar} />

        <p className={styles.hype}>{hype}</p>
        <p className={styles.workoutTitle}>{title}</p>

        <div className={styles.statsGrid}>
          <div className={styles.statItem}>
            <span className={styles.statVal}>{fmt(elapsedSeconds)}</span>
            <span className={styles.statLbl}>Duration</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statVal}>{exercises.length}</span>
            <span className={styles.statLbl}>Exercises</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statVal}>{totalSets}</span>
            <span className={styles.statLbl}>Sets</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statVal}>{totalReps}</span>
            <span className={styles.statLbl}>Reps</span>
          </div>
        </div>

        {totalVolume > 0 && (
          <p className={styles.volume}>{Math.round(totalVolume).toLocaleString()} kg total volume</p>
        )}

        <div className={styles.divider} />

        <div className={styles.exList}>
          {exercises.map((ex) => {
            const saved = ex.sets.filter((s) => s.isSaved);
            if (saved.length === 0) return null;
            return (
              <div key={ex.weId} className={styles.exRow}>
                <span className={styles.exName}>{ex.name}</span>
                <span className={styles.exSets}>{saved.length} sets</span>
              </div>
            );
          })}
        </div>

        <p className={styles.footer}>Tracked with GYM</p>
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.shareBtn} onClick={handleShare}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Share
        </button>
        <button type="button" className={styles.doneBtn} onClick={() => onDone(workoutId)}>
          Done
        </button>
      </div>
    </div>
  );
}
