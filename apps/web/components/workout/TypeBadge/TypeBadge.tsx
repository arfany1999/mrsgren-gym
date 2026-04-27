import styles from "./TypeBadge.module.css";

export type SetTypeLabel = "normal" | "warmup" | "drop" | "failure";

interface Props {
  type: SetTypeLabel;
  className?: string;
}

const LETTER: Record<Exclude<SetTypeLabel, "normal">, string> = {
  warmup: "W",
  drop: "D",
  failure: "F",
};

const CLASS: Record<Exclude<SetTypeLabel, "normal">, string> = {
  warmup: styles.warmup!,
  drop: styles.drop!,
  failure: styles.failure!,
};

export function TypeBadge({ type, className = "" }: Props) {
  if (type === "normal") return null;
  return (
    <span className={`${styles.badge} ${CLASS[type]} ${className}`} aria-label={`${type} set`}>
      {LETTER[type]}
    </span>
  );
}
