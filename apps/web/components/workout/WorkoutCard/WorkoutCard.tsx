import Link from "next/link";
import type { Workout } from "@/types/api";
import { formatRelativeDate, workoutDuration, calcVolume } from "@/lib/formatters";
import styles from "./WorkoutCard.module.css";

interface WorkoutCardProps {
  workout: Workout;
}

export function WorkoutCard({ workout }: WorkoutCardProps) {
  const duration = workoutDuration(workout.startedAt, workout.finishedAt);
  const exerciseNames = workout.workoutExercises.map((we) => we.exercise.name);
  const allSets = workout.workoutExercises.flatMap((we) => we.sets);
  const volume = calcVolume(allSets);
  const isFinished = !!workout.finishedAt;

  return (
    <Link href={`/workouts/${workout.id}`} className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <h3 className={styles.title}>{workout.title}</h3>
          {!isFinished && <span className={styles.activeBadge}>In Progress</span>}
        </div>
      </div>

      <p className={styles.date}>{formatRelativeDate(workout.startedAt)}</p>

      {exerciseNames.length > 0 && (
        <p className={styles.exercises}>
          {exerciseNames.slice(0, 4).join(" · ")}
          {exerciseNames.length > 4 && ` +${exerciseNames.length - 4} more`}
        </p>
      )}

      <div className={styles.footer}>
        <div className={styles.stats}>
          {isFinished && duration && (
            <div className={styles.stat}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
                <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <span>{duration}</span>
            </div>
          )}
          {volume > 0 && (
            <div className={styles.stat}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M6 12h2V9h8v3h2M8 12v5h8v-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>{volume.toLocaleString()} kg</span>
            </div>
          )}
          {allSets.length > 0 && (
            <div className={styles.stat}>
              <span>{allSets.length} sets</span>
            </div>
          )}
        </div>

        <svg className={styles.chevron} width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </Link>
  );
}
