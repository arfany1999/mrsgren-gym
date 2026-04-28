"use client";

import styles from "./Avatar.module.css";

// Single brand avatar across the whole app — we deliberately don't pull
// per-user photos from Gravatar / email / OAuth providers anymore.
// The image lives in /public/avatar-default.jpg.
const BRAND_AVATAR = "/avatar-default.jpg";

interface AvatarProps {
  /** Kept for accessibility only — not rendered as text or initials. */
  name?: string | null;
  /** Ignored (kept for API stability with old call sites). */
  email?: string | null;
  /** Ignored (kept for API stability with old call sites). */
  src?: string | null;
  size?: number;
  rounded?: boolean;
  className?: string;
}

export function Avatar({
  name,
  size = 64,
  rounded = true,
  className,
}: AvatarProps) {
  const label = name || "Profile";
  const boxStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: rounded ? "50%" : Math.max(8, size * 0.22),
  };
  const containerClass = [styles.avatar, className].filter(Boolean).join(" ");

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={BRAND_AVATAR}
      alt={label}
      width={size}
      height={size}
      className={containerClass}
      style={boxStyle}
    />
  );
}
