"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { TopBar } from "@/components/layout/TopBar/TopBar";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import { MuscleMap } from "@/components/ui/MuscleMap/MuscleMap";
import { fetchExerciseById } from "@/lib/exercisedb";
import type { Exercise } from "@/types/api";
import styles from "./page.module.css";

export default function ExerciseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExerciseById(id)
      .then((ex) => {
        if (!ex) router.replace("/exercises");
        else setExercise(ex);
      })
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading) {
    return (
      <div className={styles.page}>
        <TopBar title="" showBack />
        <div className={styles.loadingCenter}><Spinner size={32} /></div>
      </div>
    );
  }
  if (!exercise) return null;

  const steps = exercise.instructions
    ? exercise.instructions.split("\n").filter(Boolean)
    : [];

  return (
    <div className={styles.page}>
      <TopBar title="" showBack />

      <div className={styles.content}>
        {/* Name */}
        <h1 className={styles.name}>{exercise.name}</h1>

        {/* Muscle diagram — always works */}
        <div className={styles.diagramCard}>
          <p className={styles.cardLabel}>Muscles Worked</p>
          <MuscleMap muscles={exercise.muscleGroups} variant="full" />
          {/* Tags row */}
          <div className={styles.tagsRow}>
            {exercise.muscleGroups.map((m) => (
              <span key={m} className={styles.muscleTag}>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </span>
            ))}
            {exercise.equipment && (
              <span className={styles.equipTag}>{exercise.equipment}</span>
            )}
          </div>
        </div>

        {/* GIF animation — how to perform the exercise */}
        {exercise.videoUrl && (
          <div className={styles.gifCard}>
            <p className={styles.cardLabel}>How to Perform</p>
            <div className={styles.gifWrap}>
              <Image
                src={exercise.videoUrl}
                alt={exercise.name}
                width={280}
                height={280}
                className={styles.gif}
                unoptimized
                priority
              />
            </div>
          </div>
        )}

        {/* Instructions */}
        {steps.length > 0 && (
          <div className={styles.instructionsCard}>
            <p className={styles.cardLabel}>Instructions</p>
            <ol className={styles.steps}>
              {steps.map((step, i) => (
                <li key={i} className={styles.step}>
                  <span className={styles.stepNum}>{i + 1}</span>
                  <p className={styles.stepText}>{step}</p>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
