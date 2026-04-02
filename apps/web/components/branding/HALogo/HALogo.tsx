"use client";

import { useState } from "react";
import styles from "./HALogo.module.css";

export function HALogo() {
  const [isLifting, setIsLifting] = useState(false);

  function triggerLift() {
    setIsLifting(false);
    requestAnimationFrame(() => setIsLifting(true));
  }

  function handleAnimationEnd() {
    setIsLifting(false);
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
      onAnimationEnd={handleAnimationEnd}
    >
      <span className={styles.letter}>H</span>
      <span className={styles.barbell} aria-hidden="true">
        <span className={styles.plate} />
        <span className={styles.bar} />
        <span className={styles.plate} />
      </span>
      <span className={styles.letter}>A</span>
    </button>
  );
}
