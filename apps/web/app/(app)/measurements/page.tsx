"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { TopBar } from "@/components/layout/TopBar/TopBar";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import styles from "./page.module.css";

interface Measurement {
  id: string;
  measured_at: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
  notes: string | null;
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDate(iso: string): string {
  const parts = iso.split("-").map(Number);
  const d = new Date(parts[0]!, (parts[1] ?? 1) - 1, parts[2] ?? 1);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/* ── SVG Weight Chart ───────────────────────────────────────── */
function WeightChart({ entries }: { entries: Measurement[] }) {
  // Filter entries that have a weight, take last 30, oldest first
  const withWeight = entries
    .filter((e) => e.weight_kg != null)
    .slice(0, 30)
    .reverse();

  if (withWeight.length < 2) {
    return <p className={styles.chartEmpty}>Need at least 2 weigh-ins to show chart</p>;
  }

  const weights = withWeight.map((e) => e.weight_kg!);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = max - min || 1;

  const W = 320;
  const H = 140;
  const padX = 40;
  const padTop = 16;
  const padBot = 24;
  const chartW = W - padX - 8;
  const chartH = H - padTop - padBot;

  const points = withWeight.map((e, i) => {
    const x = padX + (i / (withWeight.length - 1)) * chartW;
    const y = padTop + chartH - ((e.weight_kg! - min) / range) * chartH;
    return { x, y, weight: e.weight_kg!, date: e.measured_at };
  });

  const polyline = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  // Gradient fill area
  const areaPath = [
    `M ${points[0]!.x.toFixed(1)},${(padTop + chartH).toFixed(1)}`,
    ...points.map((p) => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`),
    `L ${points[points.length - 1]!.x.toFixed(1)},${(padTop + chartH).toFixed(1)}`,
    "Z",
  ].join(" ");

  // Y-axis labels (min, mid, max)
  const mid = (min + max) / 2;
  const yLabels = [
    { val: max, y: padTop },
    { val: mid, y: padTop + chartH / 2 },
    { val: min, y: padTop + chartH },
  ];

  // X-axis labels: first and last date
  const firstDate = withWeight[0]!.measured_at;
  const lastDate = withWeight[withWeight.length - 1]!.measured_at;

  const lastPt = points[points.length - 1]!;

  return (
    <svg
      className={styles.chartSvg}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {yLabels.map((yl, i) => (
        <line
          key={i}
          x1={padX}
          y1={yl.y}
          x2={W - 8}
          y2={yl.y}
          stroke="var(--border-color)"
          strokeWidth="0.5"
          strokeDasharray="3,3"
          opacity="0.5"
        />
      ))}

      {/* Y-axis labels */}
      {yLabels.map((yl, i) => (
        <text
          key={i}
          x={padX - 6}
          y={yl.y + 4}
          fill="var(--text-tertiary)"
          fontSize="9"
          fontWeight="700"
          textAnchor="end"
          fontFamily="inherit"
        >
          {yl.val.toFixed(1)}
        </text>
      ))}

      {/* X-axis date labels */}
      <text
        x={padX}
        y={H - 4}
        fill="var(--text-tertiary)"
        fontSize="9"
        fontWeight="600"
        textAnchor="start"
        fontFamily="inherit"
      >
        {formatDate(firstDate).replace(/, \d{4}/, "")}
      </text>
      <text
        x={W - 8}
        y={H - 4}
        fill="var(--text-tertiary)"
        fontSize="9"
        fontWeight="600"
        textAnchor="end"
        fontFamily="inherit"
      >
        {formatDate(lastDate).replace(/, \d{4}/, "")}
      </text>

      {/* Area fill */}
      <path d={areaPath} fill="url(#weightFill)" />

      {/* Line */}
      <polyline
        points={polyline}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Data dots */}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={i === points.length - 1 ? 4 : 2.5}
          fill={i === points.length - 1 ? "var(--accent)" : "var(--bg-primary)"}
          stroke="var(--accent)"
          strokeWidth={i === points.length - 1 ? 2 : 1.5}
          opacity={i === points.length - 1 ? 1 : 0.7}
        />
      ))}

      {/* Last value label */}
      <text
        x={lastPt.x}
        y={lastPt.y - 10}
        fill="var(--accent)"
        fontSize="11"
        fontWeight="800"
        textAnchor="middle"
        fontFamily="inherit"
      >
        {lastPt.weight.toFixed(1)} kg
      </text>
    </svg>
  );
}

/* ── Main page ──────────────────────────────────────────────── */
export default function MeasurementsPage() {
  const { supabase, user } = useAuth();
  const [entries, setEntries] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [formDate, setFormDate] = useState(todayISO());
  const [formWeight, setFormWeight] = useState("");
  const [formBf, setFormBf] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchEntries = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("body_measurements")
        .select("id, measured_at, weight_kg, body_fat_pct, notes")
        .eq("user_id", user!.id)
        .order("measured_at", { ascending: false })
        .limit(50);

      if (!error) setEntries((data ?? []) as Measurement[]);
    } catch {
      // table may not exist yet
    }
  }, [supabase, user]);

  useEffect(() => {
    async function load() {
      try {
        await fetchEntries();
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [fetchEntries]);

  function openForm() {
    setFormDate(todayISO());
    setFormWeight("");
    setFormBf("");
    setFormNotes("");
    setFormError(null);
    setFormOpen(true);
  }

  async function handleSave() {
    const weight = formWeight.trim() ? parseFloat(formWeight) : null;
    const bf = formBf.trim() ? parseFloat(formBf) : null;

    if (weight != null && (isNaN(weight) || weight < 20 || weight > 400)) {
      setFormError("Weight must be between 20 and 400 kg");
      return;
    }
    if (bf != null && (isNaN(bf) || bf < 1 || bf > 60)) {
      setFormError("Body fat must be between 1% and 60%");
      return;
    }
    if (weight == null && bf == null) {
      setFormError("Enter at least weight or body fat %");
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const { error } = await supabase.from("body_measurements").upsert(
        {
          user_id: user!.id,
          measured_at: formDate,
          weight_kg: weight,
          body_fat_pct: bf,
          notes: formNotes.trim() || null,
        },
        { onConflict: "user_id,measured_at" }
      );

      if (error) {
        setFormError(error.message);
        return;
      }

      setFormOpen(false);
      await fetchEntries();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await supabase
      .from("body_measurements")
      .delete()
      .eq("id", id)
      .eq("user_id", user!.id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <div className={styles.page}>
      <TopBar
        title="Body Tracking"
        showBack
        rightAction={
          <button type="button" className={styles.addBtn} onClick={openForm}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
            Add Entry
          </button>
        }
      />

      {/* ── Add / Edit modal ────────────────────────────────── */}
      {formOpen && (
        <div
          className={styles.modalOverlay}
          onClick={() => !saving && setFormOpen(false)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Log Measurement</h2>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Date</label>
              <input
                type="date"
                className={styles.formInput}
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                max={todayISO()}
                disabled={saving}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Weight (kg)</label>
              <input
                type="number"
                className={styles.formInput}
                value={formWeight}
                onChange={(e) => setFormWeight(e.target.value)}
                placeholder="75.0"
                min={20}
                max={400}
                step={0.1}
                inputMode="decimal"
                disabled={saving}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Body Fat % (optional)</label>
              <input
                type="number"
                className={styles.formInput}
                value={formBf}
                onChange={(e) => setFormBf(e.target.value)}
                placeholder="15.0"
                min={1}
                max={60}
                step={0.1}
                inputMode="decimal"
                disabled={saving}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Notes (optional)</label>
              <textarea
                className={styles.formTextarea}
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Morning weigh-in, after fasting..."
                maxLength={200}
                disabled={saving}
              />
            </div>

            {formError && <p className={styles.formError}>{formError}</p>}

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalCancel}
                onClick={() => setFormOpen(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.modalSave}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className={styles.center}>
          <Spinner size={28} />
        </div>
      ) : entries.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" opacity="0.4">
              <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"
                fill="var(--text-tertiary)"
              />
            </svg>
          </span>
          <p className={styles.emptyTitle}>No measurements yet</p>
          <p className={styles.emptySub}>
            Tap &quot;Add Entry&quot; to start tracking your body weight and composition
          </p>
        </div>
      ) : (
        <>
          {/* ── Weight Chart ───────────────────────────────── */}
          <div className={styles.chartCard}>
            <p className={styles.chartTitle}>Weight Over Time</p>
            <WeightChart entries={entries} />
          </div>

          {/* ── Recent Entries ─────────────────────────────── */}
          <div className={styles.listSection}>
            <p className={styles.listTitle}>Recent Entries</p>
            <div className={styles.entryList}>
              {entries.map((entry, i) => (
                <div
                  key={entry.id}
                  className={styles.entryCard}
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className={styles.entryLeft}>
                    <p className={styles.entryDate}>{formatDate(entry.measured_at)}</p>
                    <div className={styles.entryMeta}>
                      {entry.weight_kg != null && (
                        <span className={styles.entryWeight}>
                          {entry.weight_kg} kg
                        </span>
                      )}
                      {entry.body_fat_pct != null && (
                        <span className={styles.entryBf}>
                          {entry.body_fat_pct}% BF
                        </span>
                      )}
                    </div>
                    {entry.notes && (
                      <p className={styles.entryNotes}>{entry.notes}</p>
                    )}
                  </div>
                  <div className={styles.entryRight}>
                    {entry.weight_kg != null && (
                      <>
                        <span className={styles.entryWeightBig}>
                          {entry.weight_kg.toFixed(1)}
                        </span>
                        <span className={styles.entryWeightUnit}>kg</span>
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    className={styles.deleteBtn}
                    onClick={() => handleDelete(entry.id)}
                    aria-label="Delete entry"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M18 6L6 18M6 6l12 12"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
