"use client";

import { useEffect, useState } from "react";
import { subscribeQueue } from "@/lib/offlineQueue";
import styles from "./OfflineBanner.module.css";

export function OfflineBanner() {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => {
    const unsub = subscribeQueue(setPending);
    return () => unsub();
  }, []);

  // Re-show banner whenever connectivity flips
  useEffect(() => setDismissed(false), [online]);

  if (online && pending === 0) return null;
  if (dismissed && online) return null;

  const isOffline = !online;
  const syncing = online && pending > 0;

  return (
    <div
      className={[styles.banner, isOffline ? styles.offline : styles.syncing].join(" ")}
      role="status"
      aria-live="polite"
    >
      <span className={styles.dot} />
      <span className={styles.text}>
        {isOffline
          ? pending > 0
            ? `Offline — ${pending} change${pending === 1 ? "" : "s"} queued`
            : "Offline — changes will sync when you reconnect"
          : syncing
          ? `Syncing ${pending} change${pending === 1 ? "" : "s"}…`
          : "Back online"}
      </span>
      {online && pending === 0 && (
        <button
          type="button"
          className={styles.closeBtn}
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
        >
          ×
        </button>
      )}
    </div>
  );
}
