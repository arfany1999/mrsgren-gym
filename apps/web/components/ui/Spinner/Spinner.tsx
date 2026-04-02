import styles from "./Spinner.module.css";

interface SpinnerProps {
  size?: number;
  color?: string;
}

export function Spinner({ size = 32, color = "var(--accent)" }: SpinnerProps) {
  return (
    <span
      className={styles.spinner}
      style={{ width: size, height: size, borderTopColor: color }}
      role="status"
      aria-label="Loading"
    />
  );
}
