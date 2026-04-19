"use client";

import Image from "next/image";
import { useMemo, useState, useCallback } from "react";
import type { ActiveExercise } from "@/contexts/WorkoutContext";
import { estimateCalories, saveReport, type WorkoutReportExercise } from "@/lib/gymProfile";
import { getTrophyProgress } from "@/lib/trophies";
import styles from "./WorkoutReport.module.css";

interface WorkoutReportProps {
  title: string;
  exercises: ActiveExercise[];
  durationMins: number;
  dayNumber: number;
  workoutDays: number;
  weightKg: number;
  userEmail: string | null;
  workoutId: string;
  onDone: (id: string) => void;
}

function formatDuration(mins: number): string {
  if (mins < 1)  return "< 1 min";
  if (mins < 60) return `${Math.round(mins)} min`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function calcVolume(exercises: ActiveExercise[]): number {
  return exercises.reduce((sum, e) =>
    sum + e.sets.filter(s => s.isSaved).reduce((v, s) =>
      v + (parseFloat(s.weightKg) || 0) * (parseInt(s.reps) || 0), 0), 0);
}

function formatVolume(v: number) {
  return v > 0 ? `${Math.round(v).toLocaleString()} kg` : null;
}

export function WorkoutReport({
  title, exercises, durationMins, dayNumber, workoutDays, weightKg, userEmail, workoutId, onDone,
}: WorkoutReportProps) {
  const trophy = getTrophyProgress(workoutDays);
  const segmentLength = trophy.nextTier
    ? trophy.nextTier.threshold - (trophy.currentTier?.threshold ?? 0)
    : 0;
  const totalSets = useMemo(
    () => exercises.reduce((sum, e) => sum + e.sets.filter(s => s.isSaved).length, 0),
    [exercises]
  );

  const exerciseRows = useMemo(() => {
    const withSets = exercises.filter(ex => ex.sets.some(s => s.isSaved));
    if (withSets.length === 0) return [];

    return withSets.map(ex => {
      const savedSets = ex.sets.filter(s => s.isSaved);
      const isCardio = ex.measurementType === "cardio";
      const isTimed  = ex.measurementType === "timed";

      let mins: number;
      if (isCardio) {
        const tracked = savedSets.reduce((sum, s) => sum + (parseFloat(s.duration) || 0), 0);
        mins = tracked > 0 ? tracked : (durationMins / withSets.length);
      } else if (isTimed) {
        mins = savedSets.reduce((sum, s) => sum + (parseInt(s.duration) || 30), 0) / 60;
      } else {
        mins = totalSets > 0
          ? (savedSets.length / totalSets) * durationMins
          : durationMins / withSets.length;
      }

      const calories = estimateCalories(weightKg, Math.max(mins, 1), ex.name, isCardio);

      let setSummary = "";
      if (ex.measurementType === "weight_reps") {
        setSummary = savedSets.map(s => `${s.weightKg || "—"}kg × ${s.reps || "—"}`).join(" · ");
      } else if (ex.measurementType === "bodyweight_reps" || ex.measurementType === "reps_only") {
        setSummary = savedSets.map(s => `${s.reps || "—"} reps`).join(" · ");
      } else if (isTimed) {
        setSummary = savedSets.map(s => `${s.duration || "—"}s`).join(" · ");
      } else if (isCardio) {
        setSummary = savedSets.map(s =>
          `${s.duration || "—"} min${s.distance ? ` / ${s.distance} km` : ""}`).join("  •  ");
      }

      return { ex, savedSets, calories, setSummary };
    });
  }, [exercises, durationMins, totalSets, weightKg]);

  const totalCalories = useMemo(
    () => exerciseRows.reduce((sum, r) => sum + r.calories, 0),
    [exerciseRows]
  );

  const volume     = calcVolume(exercises);
  const volumeStr  = formatVolume(volume);
  const totalExs   = exerciseRows.length;

  const [sharing, setSharing] = useState(false);

  // ── Generate share card image on canvas ──────────────────────
  const handleShare = useCallback(async () => {
    setSharing(true);
    try {
      const SIZE = 1080;
      const canvas = document.createElement("canvas");
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // ── Background ──────────────────────────────────────────
      const bg = ctx.createLinearGradient(0, 0, SIZE, SIZE);
      bg.addColorStop(0,   "#1a0a2e");
      bg.addColorStop(0.4, "#2d1b4e");
      bg.addColorStop(1,   "#0f172a");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, SIZE, SIZE);

      // Glow blobs
      const g1 = ctx.createRadialGradient(100, 160, 0, 100, 160, 420);
      g1.addColorStop(0, "rgba(249,115,22,0.45)");
      g1.addColorStop(1, "transparent");
      ctx.fillStyle = g1; ctx.fillRect(0, 0, SIZE, SIZE);

      const g2 = ctx.createRadialGradient(980, 220, 0, 980, 220, 380);
      g2.addColorStop(0, "rgba(168,85,247,0.38)");
      g2.addColorStop(1, "transparent");
      ctx.fillStyle = g2; ctx.fillRect(0, 0, SIZE, SIZE);

      const g3 = ctx.createRadialGradient(SIZE / 2, SIZE - 60, 0, SIZE / 2, SIZE - 60, 320);
      g3.addColorStop(0, "rgba(234,179,8,0.22)");
      g3.addColorStop(1, "transparent");
      ctx.fillStyle = g3; ctx.fillRect(0, 0, SIZE, SIZE);

      const cx = SIZE / 2;

      // ── Fire ring ────────────────────────────────────────────
      ctx.beginPath();
      ctx.arc(cx, 200, 106, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(249,115,22,0.18)";
      ctx.fill();
      ctx.strokeStyle = "rgba(249,115,22,0.5)";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.font = "88px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("🔥", cx, 200);

      // ── Day badge ────────────────────────────────────────────
      const badgeTxt = `DAY ${dayNumber}`;
      ctx.font = "800 30px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.textAlign = "center";
      const bw = ctx.measureText(badgeTxt).width + 56;
      const bh = 48, bx = cx - bw / 2, by = 334;
      ctx.beginPath();
      (ctx as CanvasRenderingContext2D & { roundRect: Function }).roundRect(bx, by, bw, bh, 24);
      ctx.fillStyle = "rgba(249,115,22,0.28)";
      ctx.fill();
      ctx.strokeStyle = "rgba(249,115,22,0.55)";
      ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = "rgba(255,200,100,0.95)";
      ctx.textBaseline = "middle";
      ctx.fillText(badgeTxt, cx, by + bh / 2);

      // ── Headline ─────────────────────────────────────────────
      ctx.font = "900 80px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.textBaseline = "top";
      ctx.fillText("Well done! 💪", cx, 402);

      // ── Calorie card ─────────────────────────────────────────
      const cardX = 120, cardY = 520, cardW = SIZE - 240, cardH = 176;
      ctx.beginPath();
      (ctx as CanvasRenderingContext2D & { roundRect: Function }).roundRect(cardX, cardY, cardW, cardH, 30);
      ctx.fillStyle = "rgba(255,255,255,0.07)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.13)";
      ctx.lineWidth = 2; ctx.stroke();

      ctx.font = "900 108px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(totalCalories.toLocaleString(), cx, cardY + 16);
      ctx.font = "800 22px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.42)";
      ctx.textBaseline = "bottom";
      ctx.fillText("K C A L   B U R N E D", cx, cardY + cardH - 14);

      // ── Stat chips row ───────────────────────────────────────
      const chips = [
        `⏱ ${formatDuration(durationMins)}`,
        `🏋️ ${totalExs} exercise${totalExs !== 1 ? "s" : ""}`,
        `✅ ${totalSets} sets`,
        ...(volumeStr ? [`⚡ ${volumeStr}`] : []),
      ];
      const step = SIZE / (chips.length + 1);
      ctx.font = "700 28px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.textBaseline = "middle";
      chips.forEach((txt, i) => {
        ctx.fillStyle = "rgba(255,255,255,0.75)";
        ctx.fillText(txt, step * (i + 1), 740);
      });

      // ── Exercise rows (top 4) ─────────────────────────────────
      const exRows = exerciseRows.slice(0, 4);
      const rowStart = 800, rowH = 56;
      exRows.forEach(({ ex, savedSets }, i) => {
        const ry = rowStart + i * rowH;
        // Row bg
        ctx.beginPath();
        (ctx as CanvasRenderingContext2D & { roundRect: Function }).roundRect(120, ry - 20, SIZE - 240, 46, 12);
        ctx.fillStyle = "rgba(255,255,255,0.05)";
        ctx.fill();
        // Name
        ctx.font = "700 26px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        const nameMaxW = SIZE - 320;
        let name = ex.name;
        while (ctx.measureText(name).width > nameMaxW && name.length > 6) name = name.slice(0, -1) + "…";
        ctx.fillText(name, 140, ry + 3);
        // Sets count
        ctx.font = "600 24px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.textAlign = "right";
        ctx.fillStyle = "rgba(255,255,255,0.38)";
        ctx.fillText(`${savedSets.length} set${savedSets.length !== 1 ? "s" : ""}`, SIZE - 140, ry + 3);
      });
      if (exerciseRows.length > 4) {
        ctx.font = "600 22px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "rgba(255,255,255,0.28)";
        ctx.fillText(`+${exerciseRows.length - 4} more exercises`, 140, rowStart + 4 * rowH + 3);
      }

      // ── Branding footer ───────────────────────────────────────
      ctx.font = "500 24px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      ctx.fillText("gym.mrgren.store", cx, SIZE - 24);

      // ── Share or download ─────────────────────────────────────
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], "workout.png", { type: "image/png" });
        if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `${title} · Day ${dayNumber}`,
            text: `${totalSets} sets · ${totalCalories} kcal burned 🔥`,
          });
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "workout-summary.png";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      }, "image/png");
    } finally {
      setSharing(false);
    }
  }, [title, dayNumber, totalCalories, durationMins, totalExs, totalSets, volumeStr, exerciseRows]);

  // ── Save report & navigate ───────────────────────────────────
  function handleDone() {
    if (userEmail) {
      const exerciseEntries: WorkoutReportExercise[] = exerciseRows.map(r => ({
        name:       r.ex.name,
        sets:       r.savedSets.length,
        calories:   r.calories,
        setSummary: r.setSummary,
      }));
      saveReport(userEmail, {
        id:            workoutId,
        date:          new Date().toISOString(),
        title,
        durationMins,
        totalCalories,
        dayNumber,
        trainingDay:   workoutDays,
        totalSets,
        totalVolume:   volume,
        exercises:     exerciseEntries,
      });
    }
    onDone(workoutId);
  }

  return (
    <div className={styles.overlay}>

      {/* ═══════════════════ HERO ═══════════════════ */}
      <div className={styles.hero}>
        <div className={styles.orb1} />
        <div className={styles.orb2} />
        <div className={styles.orb3} />

        <div className={styles.heroInner}>
          <div className={styles.fireRing}>
            <div className={styles.fireEmoji}>🔥</div>
          </div>

          <div className={styles.textBlock}>
            <div className={styles.dayBadgeRow}>
              <span className={styles.dayBadge}>Workout #{dayNumber}</span>
              <span className={styles.trainingDayBadge}>Training Day {workoutDays}</span>
            </div>
            <h1 className={styles.wellDone}>Well done, G!</h1>
            <p className={styles.tagline}>Another session in the books 💪</p>
          </div>

          <div className={styles.calsCard}>
            <span className={styles.calsNum}>{totalCalories.toLocaleString()}</span>
            <span className={styles.calsUnit}>KCAL BURNED</span>
          </div>

          <div className={styles.chips}>
            <div className={styles.chip}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.6)" strokeWidth="2"/>
                <path d="M12 7v5l3 3" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              {formatDuration(durationMins)}
            </div>
            <div className={styles.chip}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="9" width="4" height="6" rx="1" stroke="rgba(255,255,255,0.6)" strokeWidth="2"/>
                <rect x="17" y="9" width="4" height="6" rx="1" stroke="rgba(255,255,255,0.6)" strokeWidth="2"/>
                <rect x="7" y="10.5" width="10" height="3" rx="1.5" stroke="rgba(255,255,255,0.6)" strokeWidth="2"/>
              </svg>
              {totalExs} exercise{totalExs !== 1 ? "s" : ""}
            </div>
            <div className={styles.chip}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M5 12l5 5L19 7" stroke="rgba(255,255,255,0.6)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {totalSets} sets
            </div>
            {volumeStr && (
              <div className={styles.chip}>⚡ {volumeStr}</div>
            )}
          </div>

          {/* ── Championship status ──────────────────────────── */}
          <div className={styles.champCard}>
            <div className={styles.champTopBar}>
              <span className={styles.champKicker}>Championship Status</span>
              <span className={styles.champWorkoutNum}>
                Workout #{dayNumber} · Day {workoutDays}
              </span>
            </div>

            <div className={styles.champBody}>
              {trophy.nextTier ? (
                <>
                  <div className={styles.champMedalWrap}>
                    <Image
                      src={trophy.nextTier.image}
                      alt={trophy.nextTier.label}
                      width={72}
                      height={72}
                      className={styles.champMedal}
                      unoptimized
                    />
                    <span className={styles.champMedalHalo} />
                  </div>

                  <div className={styles.champInfo}>
                    <div className={styles.champCurrentLine}>
                      {trophy.currentTier ? (
                        <>
                          <span className={styles.champCurrentLbl}>Current tier</span>
                          <span className={styles.champCurrentName}>
                            {trophy.currentTier.label}
                          </span>
                        </>
                      ) : (
                        <span className={styles.champCurrentLbl}>
                          First medal on the line
                        </span>
                      )}
                    </div>

                    <div className={styles.champNextLine}>
                      <span className={styles.champDays}>{trophy.daysRemaining}</span>
                      <span className={styles.champDaysWord}>
                        day{trophy.daysRemaining === 1 ? "" : "s"} to
                      </span>
                      <span className={styles.champNextName}>
                        {trophy.nextTier.label}
                      </span>
                    </div>

                    <div className={styles.champBar}>
                      <div
                        className={styles.champBarFill}
                        style={{ width: `${trophy.segmentPercent}%` }}
                      />
                    </div>

                    <div className={styles.champCount}>
                      Day <b>{trophy.daysIntoCurrent}</b> of {segmentLength} in this tier
                    </div>
                  </div>
                </>
              ) : trophy.currentTier ? (
                <>
                  <div className={styles.champMedalWrap}>
                    <Image
                      src={trophy.currentTier.image}
                      alt={trophy.currentTier.label}
                      width={72}
                      height={72}
                      className={styles.champMedal}
                      unoptimized
                    />
                    <span className={styles.champMedalHalo} />
                  </div>
                  <div className={styles.champInfo}>
                    <div className={styles.champNextLine}>
                      <span className={styles.champNextName}>
                        {trophy.currentTier.label} Legend
                      </span>
                    </div>
                    <div className={styles.champCount}>
                      All tiers unlocked — you reached the top 🏆
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════ BREAKDOWN ═══════════════════ */}
      <div className={styles.breakdown}>
        <div className={styles.bdRow}>
          <h2 className={styles.bdTitle}>Calorie Breakdown</h2>
          <span className={styles.bdNote}>est. ±20–30%</span>
        </div>

        <div className={styles.exList}>
          {exerciseRows.map(({ ex, savedSets, calories, setSummary }) => {
            const initials = ex.name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
            return (
              <div key={ex.weId} className={styles.exCard}>
                <div className={styles.exAvatar}>{initials}</div>
                <div className={styles.exInfo}>
                  <p className={styles.exName}>{ex.name}</p>
                  <p className={styles.exMeta}>
                    {savedSets.length} set{savedSets.length !== 1 ? "s" : ""}
                    {setSummary && <span className={styles.exDetail}> · {setSummary}</span>}
                  </p>
                </div>
                <div className={styles.exCals}>
                  <span className={styles.exCalNum}>{calories}</span>
                  <span className={styles.exCalUnit}>kcal</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className={styles.totalRow}>
          <span className={styles.totalLabel}>Total burned</span>
          <div className={styles.totalRight}>
            <span className={styles.totalNum}>{totalCalories.toLocaleString()}</span>
            <span className={styles.totalUnit}>kcal</span>
          </div>
        </div>

        <p className={styles.disclaimer}>
          * Estimate only. Actual burn varies by body composition, heart rate, and intensity (±20–30%).
        </p>

        <button className={styles.shareBtn} type="button" onClick={handleShare} disabled={sharing}>
          {sharing ? (
            <>Generating…</>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="2"/>
                <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                <circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="2"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Share Workout
            </>
          )}
        </button>

        <button className={styles.doneBtn} type="button" onClick={handleDone}>
          Back to Home
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
