"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  userName?: string | null;
  workoutId: string;
  onDone: (id: string) => void;
}

const GOLD = "#D4A843";
const GOLD_LIGHT = "#E8C56D";
const COPPER = "#CD7F32";

function fmtHMS(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function calcVolume(exercises: ActiveExercise[]): number {
  return exercises.reduce(
    (sum, e) =>
      sum +
      e.sets
        .filter((s) => s.isSaved)
        .reduce((v, s) => v + (parseFloat(s.weightKg) || 0) * (parseInt(s.reps) || 0), 0),
    0,
  );
}

function ParticlesCanvas({ color }: { color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const setSize = () => {
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    setSize();

    const W = () => canvas.offsetWidth;
    const H = () => canvas.offsetHeight;
    const particles = Array.from({ length: 55 }, () => ({
      x: Math.random() * W(),
      y: Math.random() * H(),
      s: 0.4 + Math.random() * 1.4,
      vx: (Math.random() - 0.5) * 0.12,
      vy: -0.08 - Math.random() * 0.25,
      o: 0.04 + Math.random() * 0.14,
      ph: Math.random() * Math.PI * 2,
    }));

    let frame = 0;
    const draw = () => {
      ctx.clearRect(0, 0, W(), H());
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.ph += 0.008;
        if (p.y < -4) {
          p.y = H() + 4;
          p.x = Math.random() * W();
        }
        ctx.globalAlpha = p.o * (0.35 + 0.65 * Math.sin(p.ph));
        ctx.fillStyle = color;
        ctx.fillRect(p.x, p.y, p.s, p.s);
      });
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);

    const onResize = () => setSize();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, [color]);

  return <canvas ref={canvasRef} className={styles.particles} aria-hidden />;
}

export function WorkoutReport({
  title,
  exercises,
  durationMins,
  dayNumber,
  workoutDays,
  weightKg,
  userEmail,
  userName,
  workoutId,
  onDone,
}: WorkoutReportProps) {
  const totalSets = useMemo(
    () => exercises.reduce((sum, e) => sum + e.sets.filter((s) => s.isSaved).length, 0),
    [exercises],
  );

  const exerciseRows = useMemo(() => {
    const withSets = exercises.filter((ex) => ex.sets.some((s) => s.isSaved));
    if (withSets.length === 0) return [];

    return withSets.map((ex) => {
      const savedSets = ex.sets.filter((s) => s.isSaved);
      const isCardio = ex.measurementType === "cardio";
      const isTimed = ex.measurementType === "timed";

      let mins: number;
      if (isCardio) {
        const tracked = savedSets.reduce((sum, s) => sum + (parseFloat(s.duration) || 0), 0);
        mins = tracked > 0 ? tracked : durationMins / withSets.length;
      } else if (isTimed) {
        mins = savedSets.reduce((sum, s) => sum + (parseInt(s.duration) || 30), 0) / 60;
      } else {
        mins = totalSets > 0 ? (savedSets.length / totalSets) * durationMins : durationMins / withSets.length;
      }

      const calories = estimateCalories(weightKg, Math.max(mins, 1), ex.name, isCardio);

      let setSummary = "";
      if (ex.measurementType === "weight_reps") {
        setSummary = savedSets.map((s) => `${s.weightKg || "—"}kg × ${s.reps || "—"}`).join(" · ");
      } else if (ex.measurementType === "bodyweight_reps" || ex.measurementType === "reps_only") {
        setSummary = savedSets.map((s) => `${s.reps || "—"} reps`).join(" · ");
      } else if (isTimed) {
        setSummary = savedSets.map((s) => `${s.duration || "—"}s`).join(" · ");
      } else if (isCardio) {
        setSummary = savedSets
          .map((s) => `${s.duration || "—"} min${s.distance ? ` / ${s.distance} km` : ""}`)
          .join(" • ");
      }

      return { ex, savedSets, calories, setSummary };
    });
  }, [exercises, durationMins, totalSets, weightKg]);

  const totalCalories = useMemo(
    () => exerciseRows.reduce((sum, r) => sum + r.calories, 0),
    [exerciseRows],
  );
  const cardioMins = useMemo(
    () =>
      Math.round(
        exerciseRows
          .filter((r) => r.ex.measurementType === "cardio")
          .reduce((sum, r) => sum + r.savedSets.reduce((s, set) => s + (parseFloat(set.duration) || 0), 0), 0),
      ),
    [exerciseRows],
  );
  const volume = calcVolume(exercises);

  const trophy = useMemo(() => getTrophyProgress(workoutDays), [workoutDays]);
  const tier = trophy.nextTier ?? trophy.currentTier;
  const tierLabel = (tier?.label ?? "Bronze").toUpperCase();
  const tierImage = tier?.image ?? "/trophies/bronze.svg";
  const segCurrent = trophy.currentTier ? Math.max(0, workoutDays - trophy.currentTier.threshold) : workoutDays;
  const segTotal = trophy.nextTier
    ? trophy.nextTier.threshold - (trophy.currentTier?.threshold ?? 0)
    : Math.max(60, workoutDays);
  const ringPct = Math.min(1, segTotal > 0 ? segCurrent / segTotal : 1);

  const today = new Date();
  const dayName = today.toLocaleDateString(undefined, { weekday: "long" }).toUpperCase();
  const dateStr = today
    .toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })
    .toUpperCase();
  const fallbackName = userEmail ? userEmail.split("@")[0] : "ATHLETE";
  const displayName = (userName?.trim() || fallbackName || "ATHLETE").toUpperCase();

  const [sharing, setSharing] = useState(false);

  const handleShare = useCallback(async () => {
    setSharing(true);
    try {
      const W = 1080;
      const H = 1920;
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Background — deep ink
      ctx.fillStyle = "#050508";
      ctx.fillRect(0, 0, W, H);

      // Subtle radial vignette
      const vignette = ctx.createRadialGradient(W / 2, H * 0.32, H * 0.05, W / 2, H * 0.32, H * 0.7);
      vignette.addColorStop(0, "rgba(212, 168, 67, 0.08)");
      vignette.addColorStop(1, "rgba(8, 8, 14, 0)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, W, H);

      // Top + bottom gold edge accents
      const edgeGrad = (y: number) => {
        const g = ctx.createLinearGradient(W * 0.12, y, W * 0.88, y);
        g.addColorStop(0, "rgba(212, 168, 67, 0)");
        g.addColorStop(0.3, "rgba(232, 197, 109, 0.5)");
        g.addColorStop(0.5, "rgba(212, 168, 67, 0.85)");
        g.addColorStop(0.7, "rgba(232, 197, 109, 0.5)");
        g.addColorStop(1, "rgba(212, 168, 67, 0)");
        return g;
      };
      ctx.fillStyle = edgeGrad(2);
      ctx.fillRect(W * 0.12, 0, W * 0.76, 2);
      ctx.fillStyle = edgeGrad(H - 2);
      ctx.fillRect(W * 0.12, H - 2, W * 0.76, 2);

      // Corner brackets
      const cb = 36;
      const cbo = 64;
      ctx.strokeStyle = "rgba(212, 168, 67, 0.35)";
      ctx.lineWidth = 2;
      const drawCorner = (x: number, y: number, dx: number, dy: number) => {
        ctx.beginPath();
        ctx.moveTo(x + dx * cb, y);
        ctx.lineTo(x, y);
        ctx.lineTo(x, y + dy * cb);
        ctx.stroke();
      };
      drawCorner(cbo, cbo, 1, 1);
      drawCorner(W - cbo, cbo, -1, 1);
      drawCorner(cbo, H - cbo, 1, -1);
      drawCorner(W - cbo, H - cbo, -1, -1);

      // Header — site + date
      ctx.font = "300 26px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#1A1A24";
      ctx.textAlign = "left";
      ctx.fillText("GYM.MRGREN.STORE", W * 0.075, H * 0.07);
      ctx.textAlign = "right";
      ctx.fillStyle = "#1E1E28";
      ctx.fillText(dayName, W * 0.925, H * 0.06);
      ctx.fillStyle = "#14141A";
      ctx.fillText(dateStr, W * 0.925, H * 0.087);

      // "WORKOUT COMPLETE" kicker
      ctx.font = "400 22px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#22222E";
      ctx.textAlign = "center";
      ctx.fillText("W O R K O U T   C O M P L E T E", W / 2, H * 0.18);

      // Display name
      ctx.font = "300 64px 'Cormorant Garamond', serif";
      ctx.fillStyle = "#C8C8D0";
      ctx.fillText(displayName, W / 2, H * 0.235);

      // Hero divider line
      const divY = H * 0.27;
      const divGrad = ctx.createLinearGradient(W * 0.25, divY, W * 0.75, divY);
      divGrad.addColorStop(0, "rgba(212,168,67,0)");
      divGrad.addColorStop(0.5, "rgba(232,197,109,0.9)");
      divGrad.addColorStop(1, "rgba(212,168,67,0)");
      ctx.fillStyle = divGrad;
      ctx.fillRect(W * 0.25, divY - 1, W * 0.5, 2);

      // Big duration HH:MM:SS
      const durationText = fmtHMS(Math.round(durationMins * 60));
      ctx.font = "300 168px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#EAEAF0";
      ctx.fillText(durationText, W / 2, H * 0.38);
      ctx.font = "700 22px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#404050";
      ctx.fillText("D U R A T I O N", W / 2, H * 0.42);

      // Stats row
      const stats = [
        { label: "VOLUME", value: Math.round(volume).toLocaleString(), unit: "KG" },
        { label: "EXERCISES", value: String(exerciseRows.length), unit: "" },
        { label: "CARDIO", value: String(cardioMins), unit: cardioMins > 0 ? "MIN" : "" },
      ];
      const statsTop = H * 0.48;
      const statsGap = W / 3;
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(W * 0.075, statsTop);
      ctx.lineTo(W * 0.925, statsTop);
      ctx.moveTo(W * 0.075, statsTop + 170);
      ctx.lineTo(W * 0.925, statsTop + 170);
      ctx.stroke();
      stats.forEach((s, i) => {
        const cx = statsGap * i + statsGap / 2;
        ctx.font = "400 18px 'JetBrains Mono', monospace";
        ctx.fillStyle = "#404050";
        ctx.fillText(s.label, cx, statsTop + 38);
        ctx.font = "300 60px 'JetBrains Mono', monospace";
        ctx.fillStyle = "#C8C8D4";
        ctx.fillText(s.value, cx, statsTop + 110);
        if (s.unit) {
          ctx.font = "400 18px 'JetBrains Mono', monospace";
          ctx.fillStyle = "#404050";
          ctx.fillText(s.unit, cx, statsTop + 145);
        }
      });

      // Session summary
      const sumTop = H * 0.62;
      ctx.font = "400 22px 'JetBrains Mono', monospace";
      ctx.fillStyle = GOLD;
      ctx.textAlign = "left";
      ctx.fillText("SESSION SUMMARY", W * 0.075, sumTop);
      ctx.strokeStyle = "rgba(212,168,67,0.18)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(W * 0.075, sumTop + 22);
      ctx.lineTo(W * 0.925, sumTop + 22);
      ctx.moveTo(W * 0.075, sumTop + 232);
      ctx.lineTo(W * 0.925, sumTop + 232);
      ctx.stroke();
      const sumStats = [
        { value: String(exerciseRows.length), unit: "", label: "EXERCISES DONE" },
        { value: Math.round(volume).toLocaleString(), unit: "KG", label: "TOTAL VOLUME" },
        { value: totalCalories.toLocaleString(), unit: "KCAL", label: "CALORIES BURNED" },
      ];
      ctx.textAlign = "center";
      sumStats.forEach((s, i) => {
        const cx = statsGap * i + statsGap / 2;
        ctx.font = "300 80px 'JetBrains Mono', monospace";
        ctx.fillStyle = "#D0D0DC";
        ctx.fillText(s.value, cx, sumTop + 130);
        if (s.unit) {
          ctx.font = "400 18px 'JetBrains Mono', monospace";
          ctx.fillStyle = "#404050";
          ctx.fillText(s.unit, cx, sumTop + 165);
        }
        ctx.font = "400 18px 'JetBrains Mono', monospace";
        ctx.fillStyle = "#404050";
        ctx.fillText(s.label, cx, sumTop + 210);
      });

      // Tier ring + label (bottom)
      const tierTop = H * 0.84;
      ctx.font = "300 100px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#D0D0DC";
      ctx.textAlign = "center";
      ctx.fillText(String(workoutDays), W * 0.18, tierTop + 30);
      ctx.font = "400 18px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#303040";
      ctx.fillText("TRAINING DAYS", W * 0.18, tierTop + 70);

      // Center ring
      const ringCx = W / 2;
      const ringCy = tierTop + 30;
      const ringR = 110;
      ctx.beginPath();
      ctx.arc(ringCx, ringCy, ringR, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(ringCx, ringCy, ringR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ringPct);
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 5;
      ctx.lineCap = "butt";
      ctx.stroke();

      // Right tier info
      ctx.font = "700 26px 'JetBrains Mono', monospace";
      ctx.fillStyle = GOLD;
      ctx.fillText(tierLabel, W * 0.82, tierTop + 10);
      ctx.font = "400 18px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#4A4A5A";
      ctx.fillText(`${segCurrent}/${segTotal}d`, W * 0.82, tierTop + 42);
      if (trophy.nextTier && trophy.daysRemaining > 0) {
        ctx.font = "700 18px 'JetBrains Mono', monospace";
        ctx.fillStyle = GOLD_LIGHT;
        ctx.fillText(`${trophy.daysRemaining}d → ${trophy.nextTier.label.toUpperCase()}`, W * 0.82, tierTop + 75);
      }

      // Trophy image overlay (load + draw, blocking — best effort)
      await new Promise<void>((resolve) => {
        const img = new window.Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const size = 132;
          ctx.drawImage(img, ringCx - size / 2, ringCy - size / 2, size, size);
          resolve();
        };
        img.onerror = () => resolve();
        img.src = tierImage;
      });

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], "workout.png", { type: "image/png" });
        if (
          typeof navigator.canShare === "function" &&
          navigator.canShare({ files: [file] })
        ) {
          try {
            await navigator.share({
              files: [file],
              title: `${title} · Workout #${dayNumber}`,
              text: `${title} — ${totalSets} sets · ${Math.round(volume).toLocaleString()} kg`,
            });
          } catch {
            /* user cancelled */
          }
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
  }, [
    cardioMins,
    dateStr,
    dayName,
    dayNumber,
    displayName,
    durationMins,
    exerciseRows.length,
    ringPct,
    segCurrent,
    segTotal,
    tierImage,
    tierLabel,
    title,
    totalCalories,
    totalSets,
    trophy.daysRemaining,
    trophy.nextTier,
    volume,
    workoutDays,
  ]);

  function handleDone() {
    if (userEmail) {
      const exerciseEntries: WorkoutReportExercise[] = exerciseRows.map((r) => ({
        name: r.ex.name,
        sets: r.savedSets.length,
        calories: r.calories,
        setSummary: r.setSummary,
      }));
      saveReport(userEmail, {
        id: workoutId,
        date: new Date().toISOString(),
        title,
        durationMins,
        totalCalories,
        dayNumber,
        trainingDay: workoutDays,
        totalSets,
        totalVolume: volume,
        exercises: exerciseEntries,
      });
    }
    onDone(workoutId);
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <ParticlesCanvas color={COPPER} />

        {/* Rotating ray field */}
        <div className={styles.rays} aria-hidden>
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className={styles.ray} style={{ transform: `translateX(-50%) rotate(${i * 15}deg)` }} />
          ))}
        </div>

        {/* Top + bottom edge accents */}
        <div className={`${styles.edge} ${styles.edgeTop}`} />
        <div className={`${styles.edge} ${styles.edgeBottom}`} />

        {/* Corner brackets */}
        <div className={`${styles.corner} ${styles.cornerTL}`} />
        <div className={`${styles.corner} ${styles.cornerTR}`} />
        <div className={`${styles.corner} ${styles.cornerBL}`} />
        <div className={`${styles.corner} ${styles.cornerBR}`} />

        <div className={styles.cardContent}>
          {/* Header */}
          <div className={styles.headerRow}>
            <p className={styles.headerKicker}>GYM.MRGREN.STORE</p>
            <div className={styles.headerRight}>
              <p className={styles.headerDay}>{dayName}</p>
              <p className={styles.headerDate}>{dateStr}</p>
            </div>
          </div>

          {/* Hero zone */}
          <div className={styles.heroZone}>
            <p className={styles.heroKicker}>WORKOUT COMPLETE</p>
            <div className={styles.heroNameRow}>
              <div className={styles.heroTrophyWrap}>
                <Image
                  src={tierImage}
                  alt={tierLabel}
                  width={44}
                  height={44}
                  className={styles.heroTrophy}
                  unoptimized
                />
              </div>
              <h1 className={styles.heroName}>{displayName}</h1>
            </div>
            <div className={styles.heroDivider}>
              <span className={styles.dividerSide} />
              <span className={styles.dividerCenter} />
              <span className={styles.dividerSide} />
            </div>
            <div className={styles.duration}>{fmtHMS(Math.round(durationMins * 60))}</div>
            <p className={styles.durationLabel}>D U R A T I O N</p>

            <div className={styles.statsRow}>
              <div className={styles.statCol}>
                <p className={styles.statLabel}>VOLUME</p>
                <p className={styles.statValue}>{Math.round(volume).toLocaleString()}</p>
                <p className={styles.statUnit}>KG</p>
              </div>
              <div className={styles.statCol}>
                <p className={styles.statLabel}>EXERCISES</p>
                <p className={styles.statValue}>{exerciseRows.length}</p>
                <p className={styles.statUnitGhost}>·</p>
              </div>
              <div className={styles.statCol}>
                <p className={styles.statLabel}>CARDIO</p>
                <p className={styles.statValue}>{cardioMins}</p>
                {cardioMins > 0 ? (
                  <p className={styles.statUnit}>MIN</p>
                ) : (
                  <p className={styles.statUnitGhost}>·</p>
                )}
              </div>
            </div>
          </div>

          {/* Session summary */}
          <div className={styles.session}>
            <div className={styles.sessionHead}>
              <span className={styles.sessionBar} />
              <p className={styles.sessionTitle}>SESSION SUMMARY</p>
            </div>
            <div className={styles.sessionRow}>
              <div className={styles.sessionCol}>
                <p className={styles.sessionVal}>{exerciseRows.length}</p>
                <p className={styles.sessionLbl}>EXERCISES DONE</p>
              </div>
              <div className={styles.sessionCol}>
                <p className={styles.sessionVal}>{Math.round(volume).toLocaleString()}</p>
                <p className={styles.sessionUnit}>KG</p>
                <p className={styles.sessionLbl}>TOTAL VOLUME</p>
              </div>
              <div className={styles.sessionCol}>
                <p className={styles.sessionVal}>{totalCalories.toLocaleString()}</p>
                <p className={styles.sessionUnit}>KCAL</p>
                <p className={styles.sessionLbl}>CALORIES BURNED</p>
              </div>
            </div>
          </div>

          {/* Tier + streak */}
          <div className={styles.tierRow}>
            <div className={styles.streakCol}>
              <span className={styles.streakNum}>{workoutDays}</span>
              <span className={styles.streakLbl}>
                TRAINING
                <br />
                DAYS
              </span>
            </div>
            <div className={styles.tierRing}>
              <svg width="120" height="120" viewBox="0 0 120 120" className={styles.tierRingSvg} aria-hidden>
                <circle cx="60" cy="60" r="51" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="2.5" />
                <circle
                  cx="60"
                  cy="60"
                  r="51"
                  fill="none"
                  stroke={GOLD}
                  strokeWidth="2.5"
                  strokeDasharray={`${2 * Math.PI * 51 * ringPct} ${2 * Math.PI * 51}`}
                  strokeLinecap="butt"
                  transform="rotate(-90 60 60)"
                  style={{ filter: `drop-shadow(0 0 4px ${GOLD}80)` }}
                />
                <line x1="60" y1="9" x2="60" y2="15" stroke={GOLD} strokeWidth="1.5" opacity="0.5" />
              </svg>
              <Image
                src={tierImage}
                alt={tierLabel}
                width={62}
                height={62}
                className={styles.tierRingTrophy}
                unoptimized
              />
            </div>
            <div className={styles.tierInfo}>
              <span className={styles.tierName}>{tierLabel}</span>
              <span className={styles.tierProgress}>
                {segCurrent}/{segTotal}d
              </span>
              {trophy.nextTier && trophy.daysRemaining > 0 && (
                <span className={styles.tierNext}>
                  {trophy.daysRemaining}d → {trophy.nextTier.label.toUpperCase()}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Calorie breakdown */}
      <div className={styles.breakdown}>
        <div className={styles.bdHead}>
          <span className={styles.bdBar} />
          <p className={styles.bdTitle}>CALORIE BREAKDOWN</p>
          <span className={styles.bdNote}>EST. ±20–30%</span>
        </div>
        <div className={styles.bdList}>
          {exerciseRows.map(({ ex, savedSets, calories, setSummary }) => {
            const initials = ex.name
              .split(" ")
              .slice(0, 2)
              .map((w) => w[0])
              .join("")
              .toUpperCase();
            return (
              <div key={ex.weId} className={styles.bdRow}>
                <div className={styles.bdAvatar}>{initials}</div>
                <div className={styles.bdInfo}>
                  <p className={styles.bdName}>{ex.name}</p>
                  <p className={styles.bdMeta}>
                    {savedSets.length} set{savedSets.length !== 1 ? "s" : ""}
                    {setSummary && <span className={styles.bdMetaDetail}> · {setSummary}</span>}
                  </p>
                </div>
                <div className={styles.bdCals}>
                  <span className={styles.bdCalNum}>{calories}</span>
                  <span className={styles.bdCalUnit}>KCAL</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className={styles.bdTotal}>
          <span className={styles.bdTotalLbl}>TOTAL BURNED</span>
          <div className={styles.bdTotalRight}>
            <span className={styles.bdTotalNum}>{totalCalories.toLocaleString()}</span>
            <span className={styles.bdTotalUnit}>KCAL</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button
          className={styles.shareBtn}
          type="button"
          onClick={handleShare}
          disabled={sharing}
        >
          <span className={styles.shareShimmer} aria-hidden />
          <svg
            className={styles.shareIcon}
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#05050A"
            strokeWidth="2"
            strokeLinecap="square"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7,10 12,15 17,10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span className={styles.shareText}>
            {sharing ? "GENERATING…" : "SAVE TO CAMERA ROLL"}
          </span>
        </button>
        <button className={styles.doneBtn} type="button" onClick={handleDone}>
          BACK TO HOME
        </button>
      </div>
    </div>
  );
}
