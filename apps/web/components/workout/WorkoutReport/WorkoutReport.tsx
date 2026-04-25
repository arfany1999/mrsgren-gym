"use client";

import Image from "next/image";
import { useMemo, useState, useCallback } from "react";
import type { ActiveExercise } from "@/contexts/WorkoutContext";
import { estimateCalories, saveReport, type WorkoutReportExercise } from "@/lib/gymProfile";
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

function calcVolume(exercises: ActiveExercise[]): number {
  return exercises.reduce((sum, e) =>
    sum + e.sets.filter(s => s.isSaved).reduce((v, s) =>
      v + (parseFloat(s.weightKg) || 0) * (parseInt(s.reps) || 0), 0), 0);
}

// Custom artwork shown behind the report hero. One is picked at random per
// report so the celebration screen feels fresh after every workout. Files
// live under /public/banners — see public/banners/.
//
// Each banner has its own printed form ("NAME / DATE / CLASS / SUBJECT") and
// the field positions differ per layout. We overlay our actual workout data
// directly onto those blank lines via per-banner % coordinates so the report
// reads as the printed certificate filled in.
// The on-screen certificate is rendered as a 9:16 portrait card so it fills
// the phone viewport like a story screen. Source artwork is landscape, so
// we cover-crop it (object-fit: cover) and pin object-position-x per banner
// to the column where that banner's printed form sits — that's the slice
// of artwork that survives the crop.
const TARGET_RATIO = 9 / 16; // 0.5625

type FieldRect = { top: number; left: number; width: number };

type BannerSpec = {
  src: string;
  /** Width / height of the source image — used by the share canvas (still landscape). */
  ratio: number;
  /** Image x% to center horizontally inside the 9:16 frame (object-position-x). */
  objectPosX: number;
  /** Field positions in % of the source image dimensions. Container coords
   *  are derived at render time via coverFieldStyle(). */
  fields: {
    name:    FieldRect;
    date:    FieldRect;
    class:   FieldRect;
    subject: FieldRect;
  };
  /** Overlay font size is set by aspect-aware multiplier on container width. */
  fontVw: number;
};

const REPORT_BANNERS: BannerSpec[] = [
  // banner-1 — landscape (1536x1024). Form clusters around x≈41.5% of image,
  // so that's our crop center; the form mostly survives the 9:16 crop.
  {
    src: "/banners/report-1.jpg",
    ratio: 1536 / 1024,
    fontVw: 4.0,
    objectPosX: 41.5,
    fields: {
      name:    { top: 39.6, left: 25.5, width: 32.0 },
      date:    { top: 47.5, left: 25.5, width: 32.0 },
      class:   { top: 55.2, left: 32.5, width: 25.0 },
      subject: { top: 63.0, left: 28.5, width: 28.5 },
    },
  },
  // banner-2 — ultrawide 2-col (1536x350). Centering on the left column
  // (name+date) — class/subject's right column is unavoidably cropped.
  {
    src: "/banners/report-2.jpg",
    ratio: 1536 / 350,
    fontVw: 2.6,
    objectPosX: 42.5,
    fields: {
      name:    { top: 47.0, left: 33.0, width: 19.0 },
      date:    { top: 65.0, left: 33.0, width: 19.0 },
      class:   { top: 47.0, left: 67.5, width: 21.0 },
      subject: { top: 65.0, left: 60.0, width: 28.5 },
    },
  },
  // banner-3 — ultrawide form-on-the-right (1536x305). Form spans 39.5–89.5%;
  // crop centers on its midpoint so the whole form rides into view.
  {
    src: "/banners/report-3.jpg",
    ratio: 1536 / 305,
    fontVw: 2.6,
    objectPosX: 64.5,
    fields: {
      name:    { top: 23.0, left: 39.5, width: 50.0 },
      date:    { top: 38.5, left: 39.5, width: 50.0 },
      class:   { top: 53.5, left: 49.5, width: 40.0 },
      subject: { top: 68.5, left: 44.0, width: 45.5 },
    },
  },
  // banner-4 — ultrawide 2-col with hand-drawn icons (1536x272). Same
  // tradeoff as banner-2 — left column gets the crop.
  {
    src: "/banners/report-4.jpg",
    ratio: 1536 / 272,
    fontVw: 2.2,
    objectPosX: 48,
    fields: {
      name:    { top: 47.0, left: 35.0, width: 26.0 },
      date:    { top: 65.0, left: 33.0, width: 28.0 },
      class:   { top: 47.0, left: 75.5, width: 17.0 },
      subject: { top: 65.0, left: 67.0, width: 23.5 },
    },
  },
];

/** Maps a field's image-relative %-coordinates into 9:16 container
 *  coordinates after object-fit:cover with object-position-x = objectPosX%.
 *
 *  Cover into a portrait frame from a landscape image: the image scales to
 *  cover the container *height* (vertical fully visible → top% unchanged),
 *  and overflows horizontally. The horizontal scale factor is
 *  ratio_image / ratio_target. The image x = objectPosX% lands at container
 *  x = 50%; every other image x maps linearly from there.
 */
function coverFieldStyle(banner: BannerSpec, key: keyof BannerSpec["fields"]): React.CSSProperties {
  const f = banner.fields[key];
  const horizScale = banner.ratio / TARGET_RATIO;
  return {
    top:   `${f.top}%`,
    left:  `${50 + (f.left - banner.objectPosX) * horizScale}%`,
    width: `${f.width * horizScale}%`,
  };
}

export function WorkoutReport({
  title, exercises, durationMins, dayNumber, workoutDays, weightKg, userEmail, userName, workoutId, onDone,
}: WorkoutReportProps) {
  // Pick a random banner once per mount. `useState` initialiser runs only on
  // the first render, so the chosen banner is stable across re-renders for
  // a given workout — switching out only when the user finishes a new one.
  const [banner] = useState<BannerSpec>(
    () => REPORT_BANNERS[Math.floor(Math.random() * REPORT_BANNERS.length)] ?? REPORT_BANNERS[0]!,
  );

  // Values that get written onto the banner's printed form fields.
  const fillValues = useMemo(() => {
    const fallbackName = userEmail ? userEmail.split("@")[0] : "ATHLETE";
    const today = new Date();
    const dateStr = today.toLocaleDateString(undefined, {
      year: "numeric", month: "short", day: "numeric",
    });
    const sectionStr = `Workout #${dayNumber} · Day ${workoutDays}`;
    return {
      name:    (userName?.trim() || fallbackName || "ATHLETE").toUpperCase(),
      date:    dateStr,
      section: sectionStr,
      subject: title?.trim() || "Free Workout",
    };
  }, [userName, userEmail, dayNumber, workoutDays, title]);
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

  // `volume` is still used by saveReport() below as the total-volume
  // ledger entry. `volumeStr` and `totalExs` were used by the old hero
  // chips — those got removed when the report became the certificate.
  const volume = calcVolume(exercises);

  const [sharing, setSharing] = useState(false);

  // ── Generate share card ───────────────────────────────────────
  // Match what the user just saw on screen: a 9:16 portrait card,
  // banner cover-cropped with the same per-banner object-position-x,
  // and fields laid out via the same coverFieldStyle math.
  const handleShare = useCallback(async () => {
    setSharing(true);
    try {
      // 9:16 share card. 1080x1920 is the IG-story standard.
      const W = 1080;
      const H = 1920;
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctxOrNull = canvas.getContext("2d");
      if (!ctxOrNull) return;
      const ctx: CanvasRenderingContext2D = ctxOrNull;

      // Banner artwork — cover-fit into the 9:16 canvas with the same
      // object-position-x we use on screen, so the share matches the UI.
      const bannerImg = await new Promise<HTMLImageElement | null>((resolve) => {
        const img = new window.Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = banner.src;
      });
      if (bannerImg) {
        const iw = bannerImg.naturalWidth;
        const ih = bannerImg.naturalHeight;
        // Cover scale = max(W/iw, H/ih). Source is landscape into portrait,
        // so scale_y dominates → image fills H, overflows W.
        const scale = Math.max(W / iw, H / ih);
        const drawW = iw * scale;
        const drawH = ih * scale;
        // Anchor on object-position-x: source x = objectPosX% lands at canvas x = 50%.
        const drawX = W / 2 - (banner.objectPosX / 100) * drawW;
        const drawY = (H - drawH) / 2;
        ctx.drawImage(bannerImg, drawX, drawY, drawW, drawH);
      } else {
        ctx.fillStyle = "#1a0a2e";
        ctx.fillRect(0, 0, W, H);
      }

      // Paint each field at its container-relative position (same math as
      // coverFieldStyle, but in pixels).
      const horizScale = banner.ratio / TARGET_RATIO;
      function paintField(value: string, top: number, left: number, width: number, sizePx: number) {
        const containerLeftPct = 50 + (left - banner.objectPosX) * horizScale;
        const containerWidthPct = width * horizScale;
        const x = (containerLeftPct / 100) * W;
        const y = (top / 100) * H;
        const wMax = (containerWidthPct / 100) * W;
        ctx.save();
        ctx.font = `800 ${sizePx}px "Bebas Neue", "Anton", "Oswald", -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.fillStyle = "#ffd98a";
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
        ctx.shadowColor = "rgba(0,0,0,0.6)";
        ctx.shadowBlur = 4;
        ctx.shadowOffsetY = 1;
        let txt = value.toUpperCase();
        while (ctx.measureText(txt).width > wMax && txt.length > 3) txt = txt.slice(0, -2) + "…";
        // Sit just above the underline (matches translateY(-100%) in CSS).
        ctx.fillText(txt, x, y - sizePx * 0.12);
        ctx.restore();
      }

      // 9:16 → ~5% of height per em looks balanced with the on-screen card.
      const fieldFont = Math.round(H * 0.05);
      paintField(fillValues.name,    banner.fields.name.top,    banner.fields.name.left,    banner.fields.name.width,    fieldFont);
      paintField(fillValues.date,    banner.fields.date.top,    banner.fields.date.left,    banner.fields.date.width,    fieldFont);
      paintField(fillValues.section, banner.fields.class.top,   banner.fields.class.left,   banner.fields.class.width,   Math.round(fieldFont * 0.85));
      paintField(fillValues.subject, banner.fields.subject.top, banner.fields.subject.left, banner.fields.subject.width, fieldFont);

      // ── Share or download ─────────────────────────────────────
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], "workout.png", { type: "image/png" });
        if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `${fillValues.subject} · Workout #${dayNumber}`,
            text: `${fillValues.subject} — ${totalSets} sets`,
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
  }, [banner, fillValues, dayNumber, totalSets]);

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

        {/* Full-bleed banner ("certificate") sits flush at the top of the
            report so it reads as the workout's printed report card. Field
            text is positioned over the banner's dotted lines via per-banner
            % coords (BannerSpec.fields above). */}
        <div
          className={styles.certificate}
          style={{
            aspectRatio: `${TARGET_RATIO}`,
            ["--cert-font-vw" as string]: `${banner.fontVw}vw`,
            ["--cert-obj-pos-x" as string]: `${banner.objectPosX}%`,
          }}
        >
          <Image
            src={banner.src}
            alt="Workout certificate"
            fill
            priority
            sizes="100vw"
            className={styles.certImg}
          />
          <span className={styles.certField} style={coverFieldStyle(banner, "name")}>
            {fillValues.name}
          </span>
          <span className={styles.certField} style={coverFieldStyle(banner, "date")}>
            {fillValues.date}
          </span>
          <span className={styles.certField} style={coverFieldStyle(banner, "class")}>
            {fillValues.section}
          </span>
          <span className={styles.certField} style={coverFieldStyle(banner, "subject")}>
            {fillValues.subject}
          </span>
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
