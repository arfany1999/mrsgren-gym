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

const MUSCLE_COLOR: Record<string, string> = {
  chest: "#e05c5c", back: "#3a9bdc", shoulders: "#9b7fe8",
  biceps: "#e8a23a", triceps: "#e87a3a", quads: "#4caf7d",
  hamstrings: "#059669", glutes: "#0d9488", legs: "#4caf7d",
  abs: "#eab308", core: "#eab308", cardio: "#ec4899",
  "upper chest": "#e05c5c",
};

const MOTIVATIONAL_QUOTES = [
  { text: "The pain you feel today is the strength you feel tomorrow.", author: "Arnold S." },
  { text: "No shortcuts. No excuses. Just results.", author: "Gym Code" },
  { text: "Every rep is a vote for the person you're becoming.", author: "Gym Code" },
  { text: "You didn't come this far to only come this far.", author: "Gym Code" },
  { text: "Iron never lies.", author: "Henry Rollins" },
  { text: "The only bad workout is the one that didn't happen.", author: "Gym Code" },
  { text: "Truth is, nobody cares how sore you are. Show up anyway.", author: "Gym Code" },
  { text: "The truth about fitness: there is no secret. Just lift.", author: "Gym Code" },
  { text: "Truth: the bar doesn't care about your excuses.", author: "Iron Gospel" },
  { text: "The truth is heavy. That's why so few people lift it.", author: "Gym Code" },
  { text: "Your body tells the truth your mouth never will.", author: "Gym Code" },
  { text: "Lifting is the answer. What was the question?", author: "Gym Code" },
  { text: "Lift heavy. Eat. Sleep. Repeat. That's literally it.", author: "Gym Code" },
  { text: "Lifting won't solve all your problems. But it's a solid start.", author: "Gym Code" },
  { text: "The weight never lies. Your log book never forgets.", author: "Gym Code" },
  { text: "A bad day lifting still beats a good day on the couch.", author: "Gym Code" },
  { text: "Whether you think you can or you can't — pick up the bar anyway.", author: "Gym Code" },
  { text: "You can complain about being weak, or you can fix it. Not both.", author: "Gym Code" },
  { text: "You can start over. The gym doesn't hold grudges.", author: "Gym Code" },
  { text: "You cannot buy discipline. You earn it one session at a time.", author: "Gym Code" },
  { text: "You can do anything for one more rep.", author: "Gym Code" },
  { text: "I'm not sweating. I'm leaking gains.", author: "Gym Lore" },
  { text: "Leg day: feared by many, skipped by most.", author: "Gym Lore" },
  { text: "Rest day? My body auto-corrected that to 'chest day'.", author: "Gym Lore" },
  { text: "Abs are made in the kitchen. Mine are still on delivery.", author: "Gym Lore" },
  { text: "I came. I saw. I did one more set.", author: "Julius Reps-ar" },
  { text: "Discipline is remembering what you want most over what you want now.", author: "Gym Code" },
  { text: "Consistency is the most underrated superpower.", author: "Gym Code" },
  { text: "The mirror shows who you were. The bar decides who you'll be.", author: "Gym Code" },
  { text: "Champions aren't made in gyms. They're revealed there.", author: "Gym Code" },
  { text: "The mind gives up long before the body does. Train both.", author: "Gym Code" },
  { text: "Momentum is built, not born. Start. Now.", author: "Gym Code" },
  { text: "Progress is quiet. Consistency is loud.", author: "Gym Code" },
  { text: "Strength is not given. It's extracted rep by rep.", author: "Gym Code" },
  { text: "One day you'll wish you'd started sooner. Today is still sooner.", author: "Gym Code" },
  { text: "Your future self is watching through the weights you chose today.", author: "Gym Code" },
];

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

function EditableQuote({
  text,
  author,
  onChangeText,
  onChangeAuthor,
}: {
  text: string;
  author: string;
  onChangeText: (v: string) => void;
  onChangeAuthor: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div
      className={`${styles.quoteSection} ${editing ? styles.quoteEditing : ""}`}
      onClick={() => !editing && setEditing(true)}
    >
      {!editing && <span className={styles.quoteEditBadge}>EDIT</span>}
      {editing ? (
        <div onClick={(e) => e.stopPropagation()}>
          <p className={styles.quoteEditTitle}>EDIT QUOTE</p>
          <textarea
            className={styles.quoteTextarea}
            value={text}
            onChange={(e) => onChangeText(e.target.value)}
            autoFocus
            rows={3}
          />
          <input
            className={styles.quoteInput}
            value={author}
            onChange={(e) => onChangeAuthor(e.target.value)}
            placeholder="Author"
          />
          <button
            className={styles.quoteDoneBtn}
            type="button"
            onClick={() => setEditing(false)}
          >
            DONE ✓
          </button>
        </div>
      ) : (
        <>
          <p className={styles.quoteText}>&ldquo;{text}&rdquo;</p>
          <p className={styles.quoteAuthor}>— {author}</p>
        </>
      )}
    </div>
  );
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

  const totalReps = useMemo(
    () =>
      exercises.reduce(
        (sum, e) =>
          sum + e.sets.filter((s) => s.isSaved).reduce((r, s) => r + (parseInt(s.reps) || 0), 0),
        0,
      ),
    [exercises],
  );

  const cardioCalories = useMemo(
    () => Math.round(cardioMins * 8.5),
    [cardioMins],
  );
  const hasCardio = cardioMins > 0;
  const cardioExerciseNames = useMemo(
    () => exerciseRows.filter((r) => r.ex.measurementType === "cardio").map((r) => r.ex.name),
    [exerciseRows],
  );

  const muscles = useMemo(() => {
    const map: Record<string, number> = {};
    exercises.forEach((e) => {
      const groups = e.muscleGroups?.length ? e.muscleGroups : [];
      const key = groups[0]?.toLowerCase() || "";
      if (!key) return;
      map[key] = (map[key] || 0) + e.sets.filter((s) => s.isSaved).length;
    });
    return Object.entries(map)
      .filter(([, sets]) => sets > 0)
      .sort((a, b) => b[1] - a[1]);
  }, [exercises]);

  const prs = useMemo(
    () =>
      exercises.flatMap((e) =>
        e.sets
          .filter((s) => s.isPr)
          .map((s) => ({ name: e.name, weight: s.weightKg, reps: s.reps })),
      ),
    [exercises],
  );

  const randomQuote = useMemo(
    () => MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]!,
    [],
  );
  const [quoteText, setQuoteText] = useState(randomQuote.text);
  const [quoteAuthor, setQuoteAuthor] = useState(randomQuote.author);

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
  const fullDateStr = today
    .toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })
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

      // Background
      ctx.fillStyle = "#07070f";
      ctx.fillRect(0, 0, W, H);

      // Radial gold glow top
      const grd = ctx.createRadialGradient(W / 2, 300, 50, W / 2, 300, 700);
      grd.addColorStop(0, "rgba(212,168,67,0.18)");
      grd.addColorStop(1, "rgba(7,7,15,0)");
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H);

      // Radial glow bottom
      const grd2 = ctx.createRadialGradient(W / 2, H - 200, 50, W / 2, H - 200, 500);
      grd2.addColorStop(0, "rgba(212,168,67,0.08)");
      grd2.addColorStop(1, "rgba(7,7,15,0)");
      ctx.fillStyle = grd2;
      ctx.fillRect(0, 0, W, H);

      // Corner brackets
      const cb = 60;
      const cbo = 80;
      ctx.strokeStyle = "rgba(212,168,67,0.3)";
      ctx.lineWidth = 3;
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

      // Top + bottom gold edge lines
      const gl = ctx.createLinearGradient(W * 0.1, 0, W * 0.9, 0);
      gl.addColorStop(0, "rgba(212,168,67,0)");
      gl.addColorStop(0.5, "rgba(212,168,67,0.8)");
      gl.addColorStop(1, "rgba(212,168,67,0)");
      ctx.fillStyle = gl;
      ctx.fillRect(W * 0.1, 3, W * 0.8, 2);
      ctx.fillRect(W * 0.1, H - 5, W * 0.8, 2);

      // Header — site label + date
      ctx.font = "400 28px 'JetBrains Mono', monospace";
      ctx.fillStyle = "rgba(212,168,67,0.4)";
      ctx.textAlign = "left";
      ctx.fillText("GYM.MRGREN.STORE", 100, 160);

      ctx.font = "400 26px 'JetBrains Mono', monospace";
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.textAlign = "right";
      ctx.fillText(fullDateStr, W - 100, 160);

      // Day badge pill — measure text to avoid overlap
      ctx.font = "800 26px 'JetBrains Mono', monospace";
      const dayLabelW = ctx.measureText("DAY").width;
      ctx.font = "900 72px 'JetBrains Mono', monospace";
      const dayNumW = ctx.measureText(String(dayNumber)).width;
      const dayGap = 16;
      const dayContentW = dayLabelW + dayGap + dayNumW;
      const dayPillW = Math.max(240, dayContentW + 80);
      const dayPillH = 100;
      const dayPillX = W / 2 - dayPillW / 2;
      ctx.fillStyle = "rgba(212,168,67,0.15)";
      ctx.beginPath();
      ctx.roundRect(dayPillX, 200, dayPillW, dayPillH, 20);
      ctx.fill();
      ctx.strokeStyle = "rgba(212,168,67,0.4)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(dayPillX, 200, dayPillW, dayPillH, 20);
      ctx.stroke();
      const dayGroupX = W / 2 - dayContentW / 2;
      ctx.font = "800 26px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#D4A843";
      ctx.textAlign = "left";
      ctx.fillText("DAY", dayGroupX, 262);
      ctx.font = "900 72px 'JetBrains Mono', monospace";
      ctx.fillText(String(dayNumber), dayGroupX + dayLabelW + dayGap, 270);

      // Kicker
      ctx.font = "800 24px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#D4A843";
      ctx.textAlign = "center";
      ctx.fillText("✦  WORKOUT COMPLETE  ✦", W / 2, 350);

      // Workout name (large) — scale down if too wide
      ctx.textAlign = "center";
      const titleUpper = title.toUpperCase();
      let titleSize = 88;
      ctx.font = `900 ${titleSize}px 'Plus Jakarta Sans', sans-serif`;
      while (ctx.measureText(titleUpper).width > W - 160 && titleSize > 40) {
        titleSize -= 4;
        ctx.font = `900 ${titleSize}px 'Plus Jakarta Sans', sans-serif`;
      }
      ctx.fillStyle = "#F0F0F8";
      ctx.fillText(titleUpper, W / 2, 470);

      // Username (smaller) — scale down if too wide
      let nameSize = 32;
      ctx.font = `400 ${nameSize}px 'JetBrains Mono', monospace`;
      while (ctx.measureText(displayName).width > W - 160 && nameSize > 18) {
        nameSize -= 2;
        ctx.font = `400 ${nameSize}px 'JetBrains Mono', monospace`;
      }
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.fillText(displayName, W / 2, 520);

      // Big duration
      const durationTotalSecs = Math.max(0, Math.round(durationMins * 60));
      const dH = Math.floor(durationTotalSecs / 3600);
      const dM = Math.floor((durationTotalSecs % 3600) / 60);
      const durationText = `${String(dH).padStart(2, "0")}:${String(dM).padStart(2, "0")}`;
      ctx.font = "300 190px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#EAEAF0";
      ctx.fillText(durationText, W / 2, 740);
      ctx.font = "700 26px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#404050";
      ctx.fillText("D  U  R  A  T  I  O  N", W / 2, 795);

      // Gold divider before stats
      const dv = ctx.createLinearGradient(W * 0.2, 0, W * 0.8, 0);
      dv.addColorStop(0, "rgba(212,168,67,0)");
      dv.addColorStop(0.5, "rgba(212,168,67,0.8)");
      dv.addColorStop(1, "rgba(212,168,67,0)");
      ctx.fillStyle = dv;
      ctx.fillRect(W * 0.2, 830, W * 0.6, 2);

      // 4-column stats
      const stats4 = [
        { label: "CARDIO", value: String(cardioMins || 0), unit: "MIN" },
        { label: "SETS", value: String(totalSets), unit: "" },
        { label: "BURNED", value: totalCalories.toLocaleString(), unit: "KCAL" },
        { label: "VOLUME", value: volume > 0 ? Math.round(volume).toLocaleString() : "0", unit: "KG" },
      ];
      const colW = W / 4;
      stats4.forEach((s, i) => {
        const cx = colW * i + colW / 2;
        if (i > 0) {
          ctx.fillStyle = "rgba(255,255,255,0.06)";
          ctx.fillRect(colW * i, 870, 1, 260);
        }
        ctx.font = "700 22px 'JetBrains Mono', monospace";
        ctx.fillStyle = "#404050";
        ctx.textAlign = "center";
        ctx.fillText(s.label, cx, 920);
        ctx.font = "300 70px 'JetBrains Mono', monospace";
        ctx.fillStyle = "#EAEAF0";
        ctx.fillText(s.value, cx, 1020);
        if (s.unit) {
          ctx.font = "400 20px 'JetBrains Mono', monospace";
          ctx.fillStyle = "#404050";
          ctx.fillText(s.unit, cx, 1058);
        }
      });

      // Gold divider after stats
      ctx.fillStyle = dv;
      ctx.fillRect(W * 0.1, 1090, W * 0.8, 1);

      // Muscles trained bars
      ctx.font = "800 22px 'JetBrains Mono', monospace";
      ctx.fillStyle = GOLD;
      ctx.textAlign = "left";
      ctx.fillText("MUSCLES TRAINED", 100, 1150);
      let mY = 1180;
      muscles.slice(0, 4).forEach(([muscle, sets]) => {
        const c = MUSCLE_COLOR[muscle] || "#5e6272";
        const maxS = muscles[0]?.[1] || 1;
        const barW = Math.round((sets / maxS) * (W - 240));
        ctx.fillStyle = "rgba(255,255,255,0.05)";
        ctx.beginPath();
        ctx.roundRect(100, mY, W - 200, 52, 10);
        ctx.fill();
        ctx.fillStyle = c + "40";
        ctx.beginPath();
        ctx.roundRect(100, mY, barW + 100, 52, 10);
        ctx.fill();
        ctx.font = "700 26px 'Plus Jakarta Sans', sans-serif";
        ctx.fillStyle = "#EAEAF0";
        ctx.textAlign = "left";
        ctx.fillText(muscle.charAt(0).toUpperCase() + muscle.slice(1), 124, mY + 34);
        ctx.font = "700 22px 'JetBrains Mono', monospace";
        ctx.fillStyle = c;
        ctx.textAlign = "right";
        ctx.fillText(`${sets} sets`, W - 110, mY + 34);
        mY += 68;
      });

      // Quote
      const qY = mY + 40;
      ctx.font = "italic 600 36px 'Plus Jakarta Sans', sans-serif";
      ctx.fillStyle = "rgba(240,240,248,0.55)";
      ctx.textAlign = "center";
      const words = quoteText.split(" ");
      let line = "";
      const qLines: string[] = [];
      for (const w of words) {
        const test = line + w + " ";
        if (ctx.measureText(test).width > W - 200 && line) {
          qLines.push(line.trim());
          line = w + " ";
        } else {
          line = test;
        }
      }
      if (line.trim()) qLines.push(line.trim());
      qLines.forEach((l, i) => {
        ctx.fillText(i === 0 ? `“${l}` : i === qLines.length - 1 ? `${l}”` : l, W / 2, qY + i * 52);
      });
      ctx.font = "400 26px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#404050";
      ctx.fillText(`— ${quoteAuthor}`, W / 2, qY + qLines.length * 52 + 30);

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

      // Bottom branding
      ctx.font = "800 30px 'JetBrains Mono', monospace";
      ctx.fillStyle = "rgba(212,168,67,0.5)";
      ctx.textAlign = "center";
      ctx.fillText("GYM.MRGREN.STORE", W / 2, H - 120);
      ctx.font = "400 22px 'JetBrains Mono', monospace";
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fillText("Track your gains. Prove your progress.", W / 2, H - 78);

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
    dayNumber,
    displayName,
    durationMins,
    fullDateStr,
    muscles,
    quoteAuthor,
    quoteText,
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
            {/* Day badge */}
            <div className={styles.dayBadge}>
              <span className={styles.dayBadgeLabel}>DAY</span>
              <span className={styles.dayBadgeNum}>{dayNumber}</span>
            </div>
            <p className={styles.heroKicker}>✦ WORKOUT COMPLETE ✦</p>
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

            <div className={styles.statsGrid}>
              {[
                { label: "CARDIO", value: String(cardioMins || 0), unit: "MIN" },
                { label: "SETS", value: String(totalSets), unit: "" },
                { label: "BURNED", value: totalCalories.toLocaleString(), unit: "KCAL" },
                { label: "VOLUME", value: volume > 0 ? Math.round(volume).toLocaleString() : "0", unit: "KG" },
              ].map((item, i) => (
                <div key={i} className={styles.statsGridItem}>
                  <p className={styles.statLabel}>{item.label}</p>
                  <p className={styles.statValue}>{item.value}</p>
                  {item.unit && <p className={styles.statUnit}>{item.unit}</p>}
                </div>
              ))}
            </div>
          </div>

          {/* Cardio summary banner */}
          {hasCardio && (
            <div className={styles.cardioBanner}>
              <span className={styles.cardioIcon}>🏃</span>
              <div className={styles.cardioInfo}>
                <p className={styles.cardioTitle}>
                  {cardioMins} min cardio · {cardioCalories.toLocaleString()} kcal
                </p>
                <p className={styles.cardioSub}>{cardioExerciseNames.join(" · ")}</p>
              </div>
              <span className={styles.cardioBadge}>🔥 HIGH</span>
            </div>
          )}

          {/* Editable quote */}
          <EditableQuote
            text={quoteText}
            author={quoteAuthor}
            onChangeText={setQuoteText}
            onChangeAuthor={setQuoteAuthor}
          />

          {/* Muscle progress circles */}
          {muscles.length > 0 && (
            <div className={styles.musclesSection}>
              <div className={styles.sectionHead}>
                <span className={styles.sectionBar} />
                <p className={styles.sectionTitle}>MUSCLES TRAINED</p>
              </div>
              <div className={styles.musclesGrid}>
                {muscles.slice(0, 6).map(([muscle, sets]) => {
                  const color = MUSCLE_COLOR[muscle] || "#5e6272";
                  const maxSets = muscles[0]?.[1] || 1;
                  const pct = sets / maxSets;
                  const size = 88;
                  const sw = 6;
                  const r = (size - sw) / 2;
                  const circ = 2 * Math.PI * r;
                  const dash = pct * circ;
                  return (
                    <div key={muscle} className={styles.muscleCircle}>
                      <div className={styles.muscleRing}>
                        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
                          <circle cx={size / 2} cy={size / 2} r={r - 2} fill="rgba(7,7,15,0.85)" />
                          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={sw} />
                          <circle
                            cx={size / 2}
                            cy={size / 2}
                            r={r}
                            fill="none"
                            stroke={color}
                            strokeWidth={sw}
                            strokeDasharray={`${dash.toFixed(2)} ${circ.toFixed(2)}`}
                            strokeLinecap="round"
                            style={{ filter: `drop-shadow(0 0 5px ${color}90)` }}
                          />
                        </svg>
                        <div className={styles.muscleCenter}>
                          <span className={styles.muscleSets} style={{ color }}>{sets}</span>
                          <span className={styles.muscleSetsLabel}>SETS</span>
                        </div>
                      </div>
                      <p className={styles.muscleLabel} style={{ color }}>{muscle}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Personal records */}
          {prs.length > 0 && (
            <div className={styles.prSection}>
              <div className={styles.sectionHead}>
                <span className={styles.sectionBar} />
                <p className={styles.sectionTitle}>PERSONAL RECORDS 🏆</p>
              </div>
              {prs.map((pr, i) => (
                <div key={i} className={styles.prCard}>
                  <span className={styles.prEmoji}>🏆</span>
                  <div className={styles.prInfo}>
                    <p className={styles.prName}>{pr.name}</p>
                    <p className={styles.prDetail}>{pr.weight}kg × {pr.reps} reps</p>
                  </div>
                  <span className={styles.prBadge}>NEW PR</span>
                </div>
              ))}
            </div>
          )}

          {/* Session summary — 2×2 grid */}
          <div className={styles.summarySection}>
            <div className={styles.sectionHead}>
              <span className={styles.sectionBar} />
              <p className={styles.sectionTitle}>SESSION SUMMARY</p>
            </div>
            <div className={styles.summaryGrid}>
              {[
                { val: String(totalSets), label: "Total Sets", icon: "📊" },
                hasCardio
                  ? { val: `${cardioMins} min`, label: "Cardio Time", icon: "🏃" }
                  : { val: String(totalReps), label: "Total Reps", icon: "🔁" },
                { val: `${Math.round(volume).toLocaleString()} kg`, label: "Volume Lifted", icon: "💪" },
                { val: `${totalCalories} kcal`, label: "Est. Burned", icon: "🔥" },
              ].map((item, i) => (
                <div key={i} className={styles.summaryCard}>
                  <span className={styles.summaryIcon}>{item.icon}</span>
                  <div>
                    <p className={styles.summaryVal}>{item.val}</p>
                    <p className={styles.summaryLabel}>{item.label}</p>
                  </div>
                </div>
              ))}
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
            {sharing ? "GENERATING…" : "SHARE WORKOUT CARD"}
          </span>
        </button>
        <button className={styles.doneBtn} type="button" onClick={handleDone}>
          BACK TO HOME
        </button>
      </div>
    </div>
  );
}
