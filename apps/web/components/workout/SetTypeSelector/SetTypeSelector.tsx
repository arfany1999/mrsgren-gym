"use client";

import { useState } from "react";
import type { SetType } from "@/types/api";
import styles from "./SetTypeSelector.module.css";

interface SetTypeSelectorProps {
  value: SetType;
  onChange: (type: SetType) => void;
  setNumber?: number;
}

const SET_TYPES: { type: SetType; label: string; color: string }[] = [
  { type: "normal",  label: "Normal",  color: "var(--text-secondary)" },
  { type: "warmup",  label: "Warm Up", color: "var(--accent-orange)"  },
  { type: "dropset", label: "Drop Set", color: "var(--accent-blue)"   },
  { type: "failure", label: "Failure",  color: "var(--accent-red)"    },
];

function getTypeColor(type: SetType) {
  return SET_TYPES.find((t) => t.type === type)?.color ?? "var(--text-secondary)";
}

function getTypeShort(type: SetType, setNumber?: number): string {
  if (type === "normal") return setNumber != null ? String(setNumber) : "●";
  if (type === "warmup") return "W";
  if (type === "dropset") return "D";
  if (type === "failure") return "F";
  return setNumber != null ? String(setNumber) : "●";
}

export function SetTypeSelector({ value, onChange, setNumber }: SetTypeSelectorProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.wrapper}>
      <button
        className={styles.trigger}
        style={{ color: getTypeColor(value) }}
        onClick={() => setOpen((v) => !v)}
        type="button"
        aria-label="Set type"
      >
        {getTypeShort(value, setNumber)}
      </button>

      {open && (
        <div className={styles.menu}>
          {SET_TYPES.map(({ type, label, color }) => (
            <button
              key={type}
              className={[styles.option, value === type ? styles.active : ""].join(" ")}
              onClick={() => { onChange(type); setOpen(false); }}
              type="button"
            >
              <span style={{ color }}>{getTypeShort(type)}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
