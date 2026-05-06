"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";

// ── Types ─────────────────────────────────────────────────────
type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface Profile {
  id: string;
  email: string | null;
  name: string;
  username: string | null;
  avatar_url: string | null;
  sex?: "male" | "female" | null;
  age?: number | null;
  weight_kg?: number | null;
  height_cm?: number | null;
  activity_level?: string | null;
  onboarding_done?: boolean | null;
  created_at: string;
}

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  profileReady: boolean;
  status: AuthStatus;
  supabase: ReturnType<typeof createClient>;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  /** Re-fetch the user's profile row (used after avatar upload, etc.) */
  refreshProfile: () => Promise<void>;
}

interface RegisterData {
  name: string;
  username: string;
  email: string;
  password: string;
}

// ── Context ───────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileReady, setProfileReady] = useState(false);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const fallbackProfile = useCallback((authUser: User): Profile => {
    const meta = (authUser.user_metadata ?? {}) as Record<string, unknown>;
    const fallbackName =
      (meta.name as string) ||
      (meta.full_name as string) ||
      (meta.display_name as string) ||
      authUser.email?.split("@")[0] ||
      "Athlete";
    const fallbackUsername =
      (meta.username as string) ||
      authUser.email?.split("@")[0] ||
      null;

    return {
      id: authUser.id,
      email: authUser.email ?? null,
      name: fallbackName,
      username: fallbackUsername,
      avatar_url: (meta.avatar_url as string | null) ?? null,
      sex: null,
      age: null,
      weight_kg: null,
      height_cm: null,
      activity_level: null,
      onboarding_done: null,
      created_at: authUser.created_at ?? new Date().toISOString(),
    };
  }, []);

  function storedSessionFallback(): Session | null {
    if (typeof window === "undefined") return null;
    try {
      const host = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname;
      const projectRef = host.split(".")[0];
      const raw = window.localStorage.getItem(`sb-${projectRef}-auth-token`);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Session;
      if (!parsed?.user?.id || !parsed.access_token) return null;
      if (parsed.expires_at && parsed.expires_at * 1000 < Date.now()) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  const fetchProfile = useCallback(
    async (authUser: User): Promise<Profile> => {
      const base = fallbackProfile(authUser);
      const { data } = await Promise.race([
        supabase
          .from("users")
          .select("*")
          .eq("id", authUser.id)
          .maybeSingle(),
        new Promise<{ data: null }>((resolve) =>
          setTimeout(() => resolve({ data: null }), 6000),
        ),
      ]);
      const remoteProfile: Profile = {
        id: authUser.id,
        email: (data?.email as string) ?? authUser.email ?? null,
        name: (data?.name as string) ?? base.name,
        username: (data?.username as string) ?? base.username,
        avatar_url:
          (data?.avatar_url as string | null) ??
          base.avatar_url,
        sex: (data?.sex as "male" | "female" | null) ?? null,
        age: (data?.age as number | null) ?? null,
        weight_kg: (data?.weight_kg as number | null) ?? null,
        height_cm: (data?.height_cm as number | null) ?? null,
        activity_level: (data?.activity_level as string | null) ?? null,
        onboarding_done: (data?.onboarding_done as boolean | null) ?? null,
        created_at:
          (data?.created_at as string) ??
          base.created_at,
      };
      setProfile(remoteProfile);
      return remoteProfile;
    },
    [supabase, fallbackProfile]
  );

  // Listen for auth state changes.
  //
  // Critical: we set `status` based on the session ALONE — we do NOT block on
  // `fetchProfile` resolving. If the profile network request hangs (SW + RSC
  // edge cases, dead Supabase REST connection, slow link), the previous code
  // left the whole app stuck on a loading spinner forever. Profile is now
  // hydrated in the background; the AppShell can render the moment we know
  // who the user is.
  useEffect(() => {
    let cancelled = false;

    const applySession = (session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]) => {
      if (cancelled) return;
      if (session?.user) {
        setUser(session.user);
        setProfileReady(false);
        setProfile(fallbackProfile(session.user));
        setStatus("authenticated");
        // Background — failures (RLS, network, SW) must NOT block auth.
        fetchProfile(session.user)
          .catch(() => {
            setProfile(fallbackProfile(session.user));
          })
          .finally(() => {
            if (!cancelled) setProfileReady(true);
          });
      } else {
        setUser(null);
        setProfile(null);
        setProfileReady(true);
        setStatus("unauthenticated");
      }
    };

    // Race getSession() against a hard timeout so we ALWAYS settle status,
    // even if the Supabase client deadlocks reading from localStorage / the
    // cross-tab LockManager.
    const sessionPromise = supabase.auth
      .getSession()
      .then(({ data: { session } }) => session)
      .catch(() => null);
    const timeoutPromise = new Promise<Session | null>((resolve) =>
      setTimeout(() => resolve(storedSessionFallback()), 4000)
    );

    Promise.race([sessionPromise, timeoutPromise]).then(applySession);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile, fallbackProfile]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw new Error(error.message);
    },
    [supabase]
  );

  // OAuth — Google. Requires the Google provider to be enabled in the
  // Supabase project's Auth → Providers settings. Redirects back to
  // /dashboard on success; the auth state change listener picks up the
  // new session + profile (which includes the Google avatar_url in
  // user_metadata).
  const loginWithGoogle = useCallback(async () => {
    const redirectTo = typeof window !== "undefined"
      ? `${window.location.origin}/dashboard`
      : undefined;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: redirectTo ? { redirectTo } : undefined,
    });
    if (error) throw new Error(error.message);
  }, [supabase]);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user);
  }, [user, fetchProfile]);

  const register = useCallback(
    async (d: RegisterData) => {
      const { error } = await supabase.auth.signUp({
        email: d.email,
        password: d.password,
        options: {
          data: {
            name: d.name,
            username: d.username,
          },
        },
      });
      if (error) throw new Error(error.message);

    },
    [supabase]
  );

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setProfileReady(true);
    setStatus("unauthenticated");
    router.replace("/login");
  }, [supabase, router]);

  return (
    <AuthContext.Provider
      value={{ user, profile, profileReady, status, supabase, login, loginWithGoogle, register, logout, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}
