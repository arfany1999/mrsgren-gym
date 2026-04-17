// ── Smart Rest Timer helpers ──────────────────────────────────────────────

import type { SetType } from "@/types/api";

/** Default rest seconds per set type (tuned for typical hypertrophy training). */
export const REST_BY_TYPE: Record<SetType, number> = {
  normal:  90,
  warmup:  30,
  failure: 180,
  dropset: 30,
};

const REST_PREF_KEY = "gym_rest_prefs";

export interface RestPrefs {
  sound: boolean;
  vibrate: boolean;
  notify: boolean;
}

const DEFAULT_PREFS: RestPrefs = { sound: true, vibrate: true, notify: true };

export function getRestPrefs(): RestPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(REST_PREF_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch { return DEFAULT_PREFS; }
}

export function saveRestPrefs(p: RestPrefs) {
  if (typeof window === "undefined") return;
  localStorage.setItem(REST_PREF_KEY, JSON.stringify(p));
}

/** Request browser notification permission (once). */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try {
    const result = await Notification.requestPermission();
    return result === "granted";
  } catch { return false; }
}

/** Play a short "ding" tone via WebAudio (no asset required). */
export function playDing() {
  if (typeof window === "undefined") return;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const g  = ctx.createGain();
    o1.frequency.value = 880;  // A5
    o2.frequency.value = 1318; // E6 (fifth above)
    g.gain.value = 0.0;
    o1.connect(g); o2.connect(g); g.connect(ctx.destination);
    const now = ctx.currentTime;
    g.gain.linearRampToValueAtTime(0.22, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
    o1.start(now); o2.start(now + 0.05);
    o1.stop(now + 0.45); o2.stop(now + 0.45);
    setTimeout(() => { try { ctx.close(); } catch {} }, 600);
  } catch { /* ignore */ }
}

/** Buzz the device if supported. Pattern: short-short-long. */
export function vibrate() {
  if (typeof navigator === "undefined") return;
  try { navigator.vibrate?.([120, 80, 120, 80, 260]); } catch {}
}

/** Fire a native browser notification — only works if tab is in background. */
export function fireNotification(title: string, body?: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    const n = new Notification(title, {
      body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: "gym-rest",
      silent: false,
      requireInteraction: false,
    });
    setTimeout(() => { try { n.close(); } catch {} }, 8000);
  } catch {}
}

/** Fire all configured alerts (sound / vibrate / notification). */
export function alertRestDone(exerciseName?: string) {
  const prefs = getRestPrefs();
  if (prefs.sound)   playDing();
  if (prefs.vibrate) vibrate();
  if (prefs.notify)  fireNotification("Rest done 💪", exerciseName ? `Back to ${exerciseName}` : "Next set is on you.");
}
