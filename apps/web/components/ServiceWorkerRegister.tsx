"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        // Re-check for updates every 30 minutes while the tab is open
        const iv = setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000);
        // If a new SW takes over, a fresh reload gets the new assets
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          // Soft reload: only if user isn't mid-action; otherwise let next navigation pick it up
          if (document.visibilityState === "hidden") window.location.reload();
        });
        return () => clearInterval(iv);
      })
      .catch(() => {
        // Silent fail — offline features simply unavailable
      });
  }, []);
  return null;
}
