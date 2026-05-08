"use client";

import { useEffect } from "react";

// Auth boundary: a crash here would block sign-in, so the only useful
// action is "try again" and clear the failure. We don't link out to
// /dashboard because the user isn't authenticated yet.
export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (typeof console !== "undefined") {
      console.error("[(auth) error boundary]", error);
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
      <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.3 }}>Sign-in unavailable</h1>
      <p style={{ fontSize: 14, color: "var(--text-tertiary)", maxWidth: 340, lineHeight: 1.5 }}>
        Something went wrong loading the sign-in screen. Reload to try again.
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
      <button
        type="button"
        onClick={reset}
        style={{
          marginTop: 6,
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
    </div>
  );
}
