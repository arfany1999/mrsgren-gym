import Link from "next/link";
import type { Workout } from "@/types/api";
import { formatRelativeDate, formatDate, workoutDuration, calcVolume } from "@/lib/formatters";
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
        <div>
          <h3 className={styles.title}>{workout.title}</h3>
          <p className={styles.date}>{formatRelativeDate(workout.startedAt)}</p>
        </div>
        {!isFinished && <span className={styles.activeBadge}>In Progress</span>}
      </div>

      {exerciseNames.length > 0 && (
        <p className={styles.exercises}>
          {exerciseNames.slice(0, 4).join(" · ")}
          {exerciseNames.length > 4 && ` +${exerciseNames.length - 4} more`}
        </p>
      )}

      <div className={styles.stats}>
        {isFinished && (
          <div className={styles.stat}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="var(--text-tertiary)" strokeWidth="1.8" />
              <path d="M12 6v6l4 2" stroke="var(--text-tertiary)" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <span>{duration}</span>
          </div>
        )}
        {volume > 0 && (
          <div className={styles.stat}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M6 12h2v-2h8v2h2M8 12v4h8v-4" stroke="var(--text-tertiary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>{volume.toLocaleString()} kg</span>
          </div>
        )}
        <div className={styles.stat}>
          <span>{allSets.length} sets</span>
        </div>
      </div>

      <svg className={styles.chevron} width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M9 18l6-6-6-6" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  );
}
