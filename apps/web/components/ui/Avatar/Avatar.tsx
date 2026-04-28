"use client";

import { useEffect, useMemo, useState } from "react";
import { md5 } from "@/lib/md5";
import styles from "./Avatar.module.css";

interface AvatarProps {
  name?: string | null;
  email?: string | null;
  src?: string | null;       // explicit avatar_url (Google OAuth, stored profile, etc.)
  size?: number;             // rendered square size (px)
  rounded?: boolean;         // true = circle, false = rounded square
  className?: string;
}

type Stage = "src" | "gravatar" | "default";

const DEFAULT_AVATAR = "/avatar-default.jpg";

export function Avatar({
  name,
  email,
  src,
  size = 64,
  rounded = true,
  className,
}: AvatarProps) {
  // Synchronously compute the Gravatar URL from the user's email. MD5 is
  // the well-established Gravatar hashing standard (SHA-256 is supported
  // on the new endpoints but coverage at the CDN edge is still uneven).
  // `d=identicon` falls back to a unique geometric pattern derived from
  // the email if the user has no Gravatar profile — every authenticated
  // user gets a personal avatar instead of the same bundled default.
  const gravatarUrl = useMemo(() => {
    if (!email) return null;
    const hash = md5(email.trim().toLowerCase());
    return `https://gravatar.com/avatar/${hash}?s=${size * 2}&d=identicon`;
  }, [email, size]);

  const [stage, setStage] = useState<Stage>(src ? "src" : gravatarUrl ? "gravatar" : "default");

  // Reset stage when inputs change
  useEffect(() => {
    setStage(src ? "src" : gravatarUrl ? "gravatar" : "default");
  }, [src, gravatarUrl]);

  const label = name || email || "Profile";
  const boxStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: rounded ? "50%" : Math.max(8, size * 0.22),
  };

  const containerClass = [styles.avatar, className].filter(Boolean).join(" ");

  if (stage === "src" && src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={label}
        width={size}
        height={size}
        className={containerClass}
        style={boxStyle}
        referrerPolicy="no-referrer"
        onError={() => setStage(gravatarUrl ? "gravatar" : "default")}
      />
    );
  }

  if (stage === "gravatar" && gravatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={gravatarUrl}
        alt={label}
        width={size}
        height={size}
        className={containerClass}
        style={boxStyle}
        referrerPolicy="no-referrer"
        onError={() => setStage("default")}
      />
    );
  }

  // Last-resort bundled illustration
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={DEFAULT_AVATAR}
      alt={label}
      width={size}
      height={size}
      className={containerClass}
      style={boxStyle}
    />
  );
}
