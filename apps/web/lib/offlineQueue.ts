// ── Offline mutation queue (IndexedDB) ────────────────────────────────────
// Every mutation (save set, update set, delete set, etc.) is first optimistically
// applied in memory, then attempts a network write. If the write fails (offline
// or server error), it's enqueued here. A background loop (or SW sync event)
// flushes the queue when connectivity returns.

import { openDB, type IDBPDatabase } from "idb";
import type { SupabaseClient } from "@supabase/supabase-js";

const DB_NAME = "gym-offline";
const STORE   = "mutations";
const DB_VERSION = 1;

export type MutationKind =
  | "upsertSet"
  | "deleteSet"
  | "updateWorkout";

export interface PendingMutation {
  id?: number;                  // auto-increment
  kind: MutationKind;
  payload: Record<string, unknown>;
  createdAt: number;
  tries: number;
  lastError?: string;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb() {
  if (typeof window === "undefined") return null;
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
        }
      },
    });
  }
  return dbPromise;
}

export async function enqueue(kind: MutationKind, payload: Record<string, unknown>) {
  const db = await getDb();
  if (!db) return;
  await db.add(STORE, {
    kind,
    payload,
    createdAt: Date.now(),
    tries: 0,
  } as PendingMutation);
  notifyChange();
}

export async function pendingCount(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  return db.count(STORE);
}

export async function listPending(): Promise<PendingMutation[]> {
  const db = await getDb();
  if (!db) return [];
  return (await db.getAll(STORE)) as PendingMutation[];
}

async function removeById(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(STORE, id);
  notifyChange();
}

async function updateMutation(m: PendingMutation) {
  const db = await getDb();
  if (!db) return;
  await db.put(STORE, m);
  notifyChange();
}

/** Drain the queue, running each mutation against Supabase in order. */
export async function flushQueue(supabase: SupabaseClient): Promise<{ ok: number; failed: number }> {
  const pending = await listPending();
  let ok = 0, failed = 0;
  for (const m of pending) {
    try {
      await executeMutation(supabase, m);
      if (m.id != null) await removeById(m.id);
      ok++;
    } catch (e) {
      failed++;
      const next = { ...m, tries: m.tries + 1, lastError: e instanceof Error ? e.message : "unknown" };
      if (next.tries >= 5) {
        // Give up after 5 tries — remove from queue to avoid indefinite lock
        if (m.id != null) await removeById(m.id);
      } else {
        await updateMutation(next);
      }
    }
  }
  return { ok, failed };
}

async function executeMutation(supabase: SupabaseClient, m: PendingMutation) {
  switch (m.kind) {
    case "upsertSet": {
      const { setId, data } = m.payload as { setId?: string; data: Record<string, unknown> };
      if (setId) {
        const { error } = await supabase.from("workout_sets").update(data).eq("id", setId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("workout_sets").insert(data);
        if (error) throw error;
      }
      return;
    }
    case "deleteSet": {
      const { setId } = m.payload as { setId: string };
      const { error } = await supabase.from("workout_sets").delete().eq("id", setId);
      if (error) throw error;
      return;
    }
    case "updateWorkout": {
      const { workoutId, data } = m.payload as { workoutId: string; data: Record<string, unknown> };
      const { error } = await supabase.from("workouts").update(data).eq("id", workoutId);
      if (error) throw error;
      return;
    }
  }
}

// ── Change subscription (for the pending-sync UI pill) ──────────────────
type Listener = (count: number) => void;
const listeners = new Set<Listener>();

export function subscribeQueue(cb: Listener): () => void {
  listeners.add(cb);
  // Fire once immediately with current count
  pendingCount().then(cb).catch(() => cb(0));
  return () => listeners.delete(cb);
}

function notifyChange() {
  pendingCount().then(c => listeners.forEach(l => { try { l(c); } catch {} }));
}

/** Start a background flush whenever the browser comes online. */
export function startOnlineAutoFlush(supabase: SupabaseClient) {
  if (typeof window === "undefined") return () => {};
  const handler = () => { void flushQueue(supabase); };
  window.addEventListener("online", handler);
  // Also poll-flush every 30s while online (handles transient server errors)
  const iv = setInterval(() => { if (navigator.onLine) void flushQueue(supabase); }, 30_000);
  // Initial flush on mount
  if (navigator.onLine) void flushQueue(supabase);
  return () => {
    window.removeEventListener("online", handler);
    clearInterval(iv);
  };
}
