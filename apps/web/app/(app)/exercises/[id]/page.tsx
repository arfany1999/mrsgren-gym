"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar/TopBar";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import { MuscleMap } from "@/components/ui/MuscleMap/MuscleMap";
import { ExerciseAnimation } from "@/components/ui/ExerciseAnimation/ExerciseAnimation";
import { findById } from "@/lib/freeExerciseDb";
import type { FreeExercise } from "@/lib/freeExerciseDb";
import styles from "./page.module.css";

export default function ExerciseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [exercise, setExercise] = useState<FreeExercise | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const decodedId = decodeURIComponent(id);
    findById(decodedId)
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

  const allMuscles = [...exercise.primaryMuscles, ...exercise.secondaryMuscles];

  return (
    <div className={styles.page}>
      <TopBar title="" showBack />

      <div className={styles.content}>
        {/* Name */}
        <h1 className={styles.name}>{exercise.name}</h1>

        {/* Exercise animation hero — flipbook from free-exercise-db */}
        <div className={styles.animCard}>
          <p className={styles.cardLabel}>How to Perform</p>
          <div className={styles.animWrap}>
            <ExerciseAnimation
              name={exercise.name}
              muscles={exercise.primaryMuscles}
              variant="full"
            />
          </div>
        </div>

        {/* Muscle diagram */}
        <div className={styles.diagramCard}>
          <p className={styles.cardLabel}>Muscles Worked</p>
          <MuscleMap muscles={allMuscles} variant="full" />
          <div className={styles.tagsRow}>
            {allMuscles.map((m) => (
              <span key={m} className={styles.muscleTag}>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </span>
            ))}
            {exercise.equipment && (
              <span className={styles.equipTag}>{exercise.equipment}</span>
            )}
          </div>
        </div>

        {/* Instructions */}
        {exercise.instructions.length > 0 && (
          <div className={styles.instructionsCard}>
            <p className={styles.cardLabel}>Instructions</p>
            <ol className={styles.steps}>
              {exercise.instructions.map((step, i) => (
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
