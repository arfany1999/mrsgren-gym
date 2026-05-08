// Recent exercises picker memory.
//
// Two layers, intentionally:
// - localStorage: instant read on mount, no round-trip. Survives offline.
// - Supabase auth user_metadata.recent_exercises: cross-device sync. Best-
//   effort — failures are silently swallowed so a bad network never blocks
//   the picker.
//
// On every selection we write BOTH layers; on mount we hydrate from
// localStorage first (synchronous) and then merge in whatever the remote
// has (asynchronous). The merge prefers the most recently picked across
// the union, capped at MAX entries.
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { FreeExercise } from "@/lib/freeExerciseDb";

const LOCAL_KEY = "gym_recent_exercises";
const META_KEY = "recent_exercises";
const MAX = 12;

export function readRecentLocal(): FreeExercise[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LOCAL_KEY) ?? "[]") as FreeExercise[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX) : [];
  } catch {
    return [];
  }
}

function writeRecentLocal(list: FreeExercise[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    /* quota / disabled — fine */
  }
}

function readRecentMeta(user: User | null | undefined): FreeExercise[] {
  const raw = user?.user_metadata?.[META_KEY];
  if (!Array.isArray(raw)) return [];
  return (raw as FreeExercise[]).slice(0, MAX);
}

/** Merge two lists by `id`, keeping the order of `primary` first. */
function mergeRecents(primary: FreeExercise[], secondary: FreeExercise[]): FreeExercise[] {
  const seen = new Set<string>();
  const out: FreeExercise[] = [];
  for (const item of [...primary, ...secondary]) {
    if (!item?.id || seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
    if (out.length >= MAX) break;
  }
  return out;
}

/**
 * One-shot hydration: returns the localStorage list AND kicks off a
 * background fetch + merge with the server-side metadata. The optional
 * onMerged callback fires after the server merge so the UI can refresh.
 */
export function hydrateRecent(
  supabase: SupabaseClient,
  user: User | null | undefined,
  onMerged?: (list: FreeExercise[]) => void,
): FreeExercise[] {
  const local = readRecentLocal();
  if (!user) return local;

  // Fire-and-forget: pull current auth user (with fresh metadata) and
  // merge with whatever we have locally.
  void (async () => {
    try {
      const { data } = await supabase.auth.getUser();
      const remote = readRecentMeta(data.user);
      if (remote.length === 0 && local.length === 0) return;
      const merged = mergeRecents(local, remote);
      writeRecentLocal(merged);
      onMerged?.(merged);
      // If local had entries the server didn't, push them back up.
      if (merged.length !== remote.length) {
        await supabase.auth.updateUser({
          data: { [META_KEY]: merged },
        });
      }
    } catch {
      /* offline / 401 — fine, local list still works */
    }
  })();

  return local;
}

/**
 * Append a freshly-picked exercise to the recents list. Updates local
 * synchronously and pushes to user_metadata in the background.
 */
export function pushRecent(
  supabase: SupabaseClient,
  user: User | null | undefined,
  exercise: FreeExercise,
): FreeExercise[] {
  const cur = readRecentLocal();
  const next = [exercise, ...cur.filter((item) => item.id !== exercise.id)].slice(0, MAX);
  writeRecentLocal(next);

  if (user) {
    void supabase.auth.updateUser({ data: { [META_KEY]: next } }).catch(() => {});
  }
  return next;
}
