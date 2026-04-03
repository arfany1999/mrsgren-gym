"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { TopBar } from "@/components/layout/TopBar/TopBar";
import { Button } from "@/components/ui/Button/Button";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import styles from "./page.module.css";

interface Measurement {
  id: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
  chest: number | null;
  waist: number | null;
  hips: number | null;
  arms: number | null;
  legs: number | null;
  notes: string | null;
  measured_at: string;
}

const FIELDS: { key: keyof Measurement; label: string; unit: string }[] = [
  { key: "weight_kg",    label: "Weight",     unit: "kg"  },
  { key: "body_fat_pct", label: "Body Fat",   unit: "%"   },
  { key: "chest",        label: "Chest",      unit: "cm"  },
  { key: "waist",        label: "Waist",      unit: "cm"  },
  { key: "hips",         label: "Hips",       unit: "cm"  },
  { key: "arms",         label: "Arms",       unit: "cm"  },
  { key: "legs",         label: "Legs",       unit: "cm"  },
];

export default function MeasuresPage() {
  const { supabase, user } = useAuth();
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase
          .from("body_measurements")
          .select("*")
          .order("measured_at", { ascending: false })
          .limit(20);
        setMeasurements((data ?? []) as Measurement[]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [supabase]);

  async function handleSave() {
    if (!user?.id) return;
    setError("");
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        user_id: user.id,
        measured_at: new Date().toISOString(),
      };
      FIELDS.forEach(({ key }) => {
        const val = parseFloat(form[key] ?? "");
        if (!isNaN(val)) payload[key] = val;
      });
      if (form.notes?.trim()) payload.notes = form.notes.trim();

      const { data, error: saveErr } = await supabase
        .from("body_measurements")
        .insert(payload)
        .select()
        .single();

      if (saveErr) throw new Error(saveErr.message);
      setMeasurements((prev) => [data as Measurement, ...prev]);
      setForm({});
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  return (
    <div className={styles.page}>
      <TopBar
        title="Measures"
        showBack
        rightAction={
          <button type="button" className={styles.addBtn} onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Cancel" : "+ Log"}
          </button>
        }
      />

      {showForm && (
        <div className={styles.form}>
          <div className={styles.formGrid}>
            {FIELDS.map(({ key, label, unit }) => (
              <div key={key} className={styles.formField}>
                <label className={styles.fieldLabel}>{label} <span className={styles.unit}>({unit})</span></label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  placeholder="—"
                  className={styles.fieldInput}
                  value={form[key] ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <div className={styles.formField}>
            <label className={styles.fieldLabel}>Notes</label>
            <input
              type="text"
              placeholder="Optional note..."
              className={styles.fieldInput}
              value={form.notes ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <Button fullWidth onClick={handleSave} loading={saving}>Save Measurement</Button>
        </div>
      )}

      {loading ? (
        <div className={styles.center}><Spinner size={28} /></div>
      ) : measurements.length === 0 ? (
        <div className={styles.empty}>
          <p>No measurements yet.</p>
          <p className={styles.emptyHint}>Tap &quot;+ Log&quot; to record your first measurement.</p>
        </div>
      ) : (
        <div className={styles.list}>
          {measurements.map((m) => (
            <div key={m.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.cardDate}>{formatDate(m.measured_at)}</span>
                {m.weight_kg != null && (
                  <span className={styles.cardWeight}>{m.weight_kg} kg</span>
                )}
              </div>
              <div className={styles.cardBody}>
                {FIELDS.filter(({ key }) => key !== "weight_kg" && m[key] != null).map(({ key, label, unit }) => (
                  <div key={key} className={styles.cardStat}>
                    <span className={styles.cardStatVal}>{m[key]}{unit}</span>
                    <span className={styles.cardStatLabel}>{label}</span>
                  </div>
                ))}
              </div>
              {m.notes && <p className={styles.cardNotes}>{m.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
