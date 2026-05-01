"use client";

import { useRouter } from "next/navigation";
import styles from "./TopBar.module.css";

interface TopBarProps {
  title: string;
  subtitle?: string;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  showBack?: boolean;
}

function BackIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M15 18l-6-6 6-6" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TopBar({ title, subtitle, leftAction, rightAction, showBack = false }: TopBarProps) {
  const router = useRouter();

  return (
    <div className={styles.bar}>
      <div className={styles.left}>
        {showBack ? (
          <button className={styles.backBtn} onClick={() => router.back()} aria-label="Go back">
            <BackIcon />
            <span>Back</span>
          </button>
        ) : (
          leftAction
        )}
      </div>

      <div className={styles.titleWrap}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>

      <div className={styles.right}>{rightAction}</div>
    </div>
  );
}
