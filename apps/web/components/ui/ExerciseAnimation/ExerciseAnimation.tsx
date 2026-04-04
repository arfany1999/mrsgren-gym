"use client";

import { useState, useEffect } from "react";
import { MuscleMap } from "@/components/ui/MuscleMap/MuscleMap";
import { findExerciseId, imageUrlById } from "@/lib/freeExerciseDb";
import styles from "./ExerciseAnimation.module.css";

interface Props {
  name: string;
  muscles: string[];
  /** "full" = large hero (detail page). "thumb" = small thumbnail (list). */
  variant?: "full" | "thumb";
}

export function ExerciseAnimation({ name, muscles, variant = "full" }: Props) {
  const [frame0, setFrame0] = useState<string | null>(null);
  const [frame1, setFrame1] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    findExerciseId(name).then((id) => {
      if (cancelled) return;
      if (!id) { setFailed(true); return; }
      setFrame0(imageUrlById(id, 0));
      setFrame1(imageUrlById(id, 1));
    });
    return () => { cancelled = true; };
  }, [name]);

  // Still resolving → show skeleton pulse
  if (!frame0 && !failed) {
    return (
      <div className={variant === "full" ? styles.skeletonFull : styles.skeletonThumb} />
    );
  }

  // No match found → fall back to MuscleMap
  if (failed || !frame0) {
    return (
      <MuscleMap
        muscles={muscles}
        variant={variant === "full" ? "full" : "compact"}
      />
    );
  }

  return (
    <div className={variant === "full" ? styles.wrapFull : styles.wrapThumb}>
      {/* Frame 0 — start position */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={frame0}
        alt={`${name} — position 1`}
        className={styles.frame0}
        onError={() => setFailed(true)}
        draggable={false}
      />
      {/* Frame 1 — end position */}
      {frame1 && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={frame1}
          alt={`${name} — position 2`}
          className={styles.frame1}
          draggable={false}
        />
      )}
    </div>
  );
}
