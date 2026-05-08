"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (typeof console !== "undefined") {
      console.error("[(app) error boundary]", error);
    }
  }, [error]);

  return (
    <div
      style={{
        minHeight: "70dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        padding: "32px 24px",
        textAlign: "center",
        color: "var(--text-primary)",
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "rgba(212, 168, 67, 0.12)",
          border: "1px solid rgba(212, 168, 67, 0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 9v4M12 17h.01" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="12" cy="12" r="9" stroke="var(--accent)" strokeWidth="2" />
        </svg>
      </div>
      <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.3 }}>Something broke</h1>
      <p style={{ fontSize: 14, color: "var(--text-tertiary)", maxWidth: 320, lineHeight: 1.5 }}>
        This page hit an unexpected error. Your workouts and routines are safe — try the page
        again, or head back to the dashboard.
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
            padding: "10px 18px",
            borderRadius: 999,
            background:
              "linear-gradient(135deg, #8B7335 0%, #D4A843 50%, #E8C56D 100%)",
            color: "#1a1408",
            fontWeight: 800,
            border: "none",
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          Try again
        </button>
        <Link
          href="/dashboard"
          style={{
            padding: "10px 18px",
            borderRadius: 999,
            background: "var(--bg-elevated)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-color)",
            fontWeight: 700,
            textDecoration: "none",
            fontSize: 13,
          }}
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
