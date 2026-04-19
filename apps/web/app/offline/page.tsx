"use client";

export default function OfflinePage() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "var(--bg-primary)",
        color: "var(--text-primary)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        textAlign: "center",
        gap: "16px",
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          background: "var(--accent-dim)",
          border: "1px solid var(--border-color)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
          <path
            d="M1 8a15 15 0 0122 0M5 12a11 11 0 0114 0M9 16a6 6 0 016 0M12 20h.01"
            stroke="var(--accent)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <line x1="2" y1="22" x2="22" y2="2" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <h1
        style={{
          fontSize: "24px",
          fontWeight: 900,
          letterSpacing: "-0.5px",
          margin: 0,
        }}
      >
        You&apos;re offline
      </h1>
      <p
        style={{
          fontSize: "14px",
          color: "var(--text-secondary)",
          maxWidth: "300px",
          lineHeight: 1.5,
        }}
      >
        This page isn&apos;t cached yet. Workouts you start or log while offline will
        sync automatically the moment you&apos;re back online.
      </p>
      <button
        onClick={() => {
          if (typeof window !== "undefined") window.location.reload();
        }}
        style={{
          marginTop: "8px",
          padding: "10px 22px",
          background: "var(--accent)",
          color: "#000",
          border: "none",
          borderRadius: "999px",
          fontSize: "14px",
          fontWeight: 800,
          cursor: "pointer",
        }}
      >
        Retry
      </button>
    </div>
  );
}
