"use client";

import Image from "next/image";
import { useState } from "react";
import styles from "./HALogo.module.css";

/**
 * GYM brand mark — Spartan-shield artwork inside an animated tap target.
 *
 * The image lives at /public/icons/icon-512.png so it doubles as the PWA
 * install icon. Tapping/hovering plays a soft "lift" bounce so the mark
 * still feels alive, matching the previous SVG-letters version.
 */
export function HALogo({ size = 88 }: { size?: number }) {
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
      aria-label="GYM logo"
      onMouseEnter={triggerLift}
      onFocus={triggerLift}
      onTouchStart={triggerLift}
      onClick={triggerLift}
      style={{ width: size, height: size }}
    >
      <span className={styles.glow} aria-hidden />
      <Image
        src="/icons/icon-512.png"
        alt=""
        width={size}
        height={size}
        priority
        sizes={`${size}px`}
        className={styles.img}
      />
    </button>
  );
}
