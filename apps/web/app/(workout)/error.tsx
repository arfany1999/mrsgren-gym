"use client";

import { useEffect } from "react";
import Link from "next/link";

// Active-workout boundary: kept separate from (app) so a crash mid-set
// surfaces the right framing — your in-progress data is held by the
// service worker / offline queue and you can either retry the screen or
// bail back to the dashboard.
export default function WorkoutError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (typeof console !== "undefined") {
      console.error("[(workout) error boundary]", error);
    }
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        padding: "32px 24px",
        textAlign: "center",
        color: "var(--text-primary)",
        background: "var(--bg-primary)",
      }}
    >
      <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: -0.4 }}>Workout view crashed</h1>
      <p style={{ fontSize: 14, color: "var(--text-tertiary)", maxWidth: 340, lineHeight: 1.5 }}>
        Sets you&apos;ve already saved are safe in your history. Reopen the workout to keep going,
        or head back to pick a different routine.
      </p>
      {error.digest && (
        <p
          style={{
            fontFamily: "var(--font-mono), 'JetBrains Mono', monospace",
            fontSize: 10,
            color: "var(--text-tertiary)",
            opacity: 0.6,
          }}
        >
          ref · {error.digest}
        </p>
      )}
      <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
        <button
          type="button"
          onClick={reset}
          style={{
            padding: "12px 22px",
            borderRadius: 999,
            background:
              "linear-gradient(135deg, #8B7335 0%, #D4A843 50%, #E8C56D 100%)",
            color: "#1a1408",
            fontWeight: 800,
            border: "none",
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          Reopen workout
        </button>
        <Link
          href="/dashboard"
          style={{
            padding: "12px 22px",
            borderRadius: 999,
            background: "var(--bg-elevated)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-color)",
            fontWeight: 700,
            textDecoration: "none",
            fontSize: 14,
          }}
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
