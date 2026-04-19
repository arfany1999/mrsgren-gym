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

type Stage = "src" | "gravatar" | "initials";

async function sha256Hex(text: string): Promise<string> {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hashHue(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = text.charCodeAt(i) + ((h << 5) - h);
  return Math.abs(h) % 360;
}

function initialsOf(source: string): string {
  const t = source.trim();
  if (!t) return "?";
  const parts = t.split(/\s+/);
  if (parts.length >= 2) {
    const a = parts[0]?.[0] ?? "";
    const b = parts[1]?.[0] ?? "";
    return (a + b).toUpperCase();
  }
  return t.slice(0, 2).toUpperCase();
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
      if (!src) setStage("initials");
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
    setStage(src ? "src" : email ? "gravatar" : "initials");
  }, [src, email]);

  const label = name || email || "Profile";
  const initials = initialsOf(name || email || "?");
  const hue = hashHue(name || email || "x");
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
        onError={() => setStage("initials")}
      />
    );
  }

  // Initials fallback with deterministic hue
  return (
    <div
      className={[containerClass, styles.initialsFallback].join(" ")}
      style={{
        ...boxStyle,
        background: `linear-gradient(135deg, hsl(${hue} 70% 58%), hsl(${(hue + 40) % 360} 65% 48%))`,
        fontSize: size * 0.38,
      }}
      role="img"
      aria-label={label}
    >
      <span className={styles.initialsText}>{initials}</span>
    </div>
  );
}
