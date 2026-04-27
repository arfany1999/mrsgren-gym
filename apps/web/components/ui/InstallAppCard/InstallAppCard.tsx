"use client";

import { useEffect, useState } from "react";
import styles from "./InstallAppCard.module.css";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type NavigatorWithStandalone = Navigator & { standalone?: boolean };

type Platform = "android" | "ios" | "desktop";

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  return (window.navigator as NavigatorWithStandalone).standalone === true;
}

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

/**
 * Inline install-promo card for the auth pages.
 *
 * On Android / desktop Chromium browsers, the browser fires
 * `beforeinstallprompt` once we're a valid PWA — we capture it and expose a
 * one-tap "Install" button. iOS Safari doesn't have this event, so we instead
 * render the standard "Share → Add to Home Screen" walkthrough. Already-
 * installed users see nothing.
 */
export function InstallAppCard() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<Platform>("desktop");
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());
    setInstalled(isStandalone());
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  const canPromptNative = deferred !== null;
  const isIos = platform === "ios";

  async function doInstall() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  }

  return (
    <div className={styles.card} role="region" aria-label="Install GYM">
      <div className={styles.glow} aria-hidden />
      <div className={styles.row}>
        <div className={styles.iconWrap} aria-hidden>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v12" />
            <path d="m7 11 5 5 5-5" />
            <path d="M5 21h14" />
          </svg>
        </div>
        <div className={styles.body}>
          <div className={styles.title}>Install GYM as an app</div>
          <p className={styles.copy}>
            Full screen, offline-ready, one tap from your home screen.
          </p>

          {canPromptNative ? (
            <button type="button" onClick={doInstall} className={styles.installBtn}>
              Install now
            </button>
          ) : isIos ? (
            <ol className={styles.steps}>
              <li>
                <span className={styles.stepNum}>1</span>
                Tap the
                <span className={styles.kbd} aria-label="Share">
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M12 3v12" />
                    <path d="m8 7 4-4 4 4" />
                    <path d="M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
                  </svg>
                  Share
                </span>
                button in Safari
              </li>
              <li>
                <span className={styles.stepNum}>2</span>
                Choose <span className={styles.kbd}>Add to Home Screen</span>
              </li>
              <li>
                <span className={styles.stepNum}>3</span>
                Open GYM from your home screen
              </li>
            </ol>
          ) : (
            <p className={styles.copy}>
              Open your browser menu and choose{" "}
              <span className={styles.kbd}>Install app</span> or{" "}
              <span className={styles.kbd}>Add to Home Screen</span>.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
