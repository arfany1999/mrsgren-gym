"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const isLocalPreview = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
    if (isLocalPreview) {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => Promise.all(registrations.map((reg) => reg.unregister())))
        .then(() => {
          if ("caches" in window) {
            return caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))));
          }
        })
        .catch(() => {});
      return;
    }

    let iv: ReturnType<typeof setInterval> | undefined;

    const onControllerChange = () => {
      // Soft reload: only if user isn't mid-action; otherwise let next navigation pick it up
      if (document.visibilityState === "hidden") window.location.reload();
    };

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        // Re-check for updates every 30 minutes while the tab is open
        iv = setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000);
        // If a new SW takes over, a fresh reload gets the new assets
        navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
      })
      .catch(() => {
        // Silent fail — offline features simply unavailable
      });

    return () => {
      if (iv) clearInterval(iv);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);
  return null;
}
