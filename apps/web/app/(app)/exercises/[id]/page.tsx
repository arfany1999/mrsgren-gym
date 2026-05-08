"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar/TopBar";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import { BodyMuscleIcon } from "@/components/ui/BodyMuscleIcon/BodyMuscleIcon";
import { findById } from "@/lib/freeExerciseDb";
import type { FreeExercise } from "@/lib/freeExerciseDb";
import { ExerciseProgress } from "@/components/exercise/ExerciseProgress/ExerciseProgress";
import styles from "./page.module.css";

export default function ExerciseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const decodedId = decodeURIComponent(id);
  const [exercise, setExercise] = useState<FreeExercise | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    findById(decodedId)
      .then((ex) => setExercise(ex))
      .finally(() => setLoading(false));
  }, [decodedId]);

  if (loading) {
    return (
      <div className={styles.page}>
        <TopBar title="" showBack />
        <div className={styles.loadingCenter}><Spinner size={32} /></div>
      </div>
    );
  }

  // Two render paths:
  //   1. URL is a FreeExerciseDb id ("Barbell_Bench_Press_-_Medium_Grip"):
  //      render the full library card (name, muscle diagram, instructions)
  //      AND the user's progression for that name.
  //   2. URL is a custom exercise name ("Flat Barbell Bench Press"): the
  //      FreeDb lookup returns null, so we render a minimal header (just
  //      the name) and the progression — no instructions exist for
  //      user-defined exercises. This is the path "My Exercises" cards
  //      take.
  // Either way we always show ExerciseProgress so the page never feels
  // empty for a real lift.
  const displayName = exercise?.name ?? decodedId;
  const allMuscles = exercise
    ? [...exercise.primaryMuscles, ...exercise.secondaryMuscles]
    : [];

  return (
    <div className={styles.page}>
      <TopBar title="" showBack />

      <div className={styles.content}>
        <h1 className={styles.name}>{displayName}</h1>

        {exercise && (
          <div className={styles.diagramCard}>
            <p className={styles.cardLabel}>Target Muscles</p>
            <BodyMuscleIcon muscles={exercise.primaryMuscles} variant="full" />
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
        )}

        {exercise && exercise.instructions.length > 0 && (
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

      {/* Always render progression — works for both FreeDb-named and
          user-named exercises since the resolver matches by name. */}
      <ExerciseProgress exerciseName={displayName} />
    </div>
  );
}
