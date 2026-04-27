// ── Haptic feedback helper ───────────────────────────────────────────────
// Tiny wrappers around navigator.vibrate so taps on primary buttons feel
// like native iOS/Android touches instead of silent web clicks. The Web
// Vibration API is a Safari/iOS no-op (Apple disables it), but Android +
// Chrome on most devices honour it — and the browsers that don't simply
// ignore the call. Always cheap to invoke.
//
// Light  =  10ms — primary taps (Save, Start, Add Set, set checkmark)
// Medium =  18ms — destructive confirms (Finish, Discard)
// Success= [10, 40, 10] — set saved / workout finished / PR celebration

type Pattern = "light" | "medium" | "success";

const PATTERNS: Record<Pattern, number | number[]> = {
  light:   10,
  medium:  18,
  success: [10, 40, 10],
};

export function haptic(pattern: Pattern = "light"): void {
  if (typeof navigator === "undefined") return;
  if (typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(PATTERNS[pattern]);
  } catch {
    // Some browsers throw on permissions or in restricted contexts; ignore.
  }
}
