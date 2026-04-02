"use client";

import { useState } from "react";
import styles from "./HALogo.module.css";

export function HALogo() {
  const [isLifting, setIsLifting] = useState(false);

  function triggerLift() {
    setIsLifting(false);
    requestAnimationFrame(() => {
      setIsLifting(true);
      window.setTimeout(() => setIsLifting(false), 820);
    });
  }

  return (
    <button
      type="button"
      className={`${styles.logo} ${isLifting ? styles.lifting : ""}`}
      aria-label="HA gym logo lifting a barbell"
      onMouseEnter={triggerLift}
      onFocus={triggerLift}
      onTouchStart={triggerLift}
      onClick={triggerLift}
    >
      <span className={styles.word} aria-hidden="true">
        <span className={styles.letter}>H</span>
        <span className={styles.joiner} />
        <span className={styles.letter}>A</span>
      </span>
      <span className={styles.barbell} aria-hidden="true">
        <span className={styles.plate} />
        <span className={styles.bar} />
        <span className={styles.plate} />
      </span>
    </button>
  );
}
