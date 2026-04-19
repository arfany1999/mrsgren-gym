"use client";

import { useEffect, useState } from "react";
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

async function sha256Hex(text: string): Promise<string> {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function Avatar({
  name,
  email,
  src,
  size = 64,
  rounded = true,
  className,
}: AvatarProps) {
  const [gravatarUrl, setGravatarUrl] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>(src ? "src" : "gravatar");

  // Compute gravatar URL from email
  useEffect(() => {
    let cancelled = false;
    if (!email) {
      if (!src) setStage("default");
      return;
    }
    sha256Hex(email.trim().toLowerCase()).then((hash) => {
      if (cancelled) return;
      // s = size*2 for retina; d=404 tells Gravatar to 404 if no avatar exists
      setGravatarUrl(`https://gravatar.com/avatar/${hash}?s=${size * 2}&d=404`);
    });
    return () => {
      cancelled = true;
    };
  }, [email, size, src]);

  // Reset stage when inputs change
  useEffect(() => {
    setStage(src ? "src" : email ? "gravatar" : "default");
  }, [src, email]);

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
        onError={() => setStage("gravatar")}
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

  // Default bundled avatar illustration
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
