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
import type { User } from "@supabase/supabase-js";

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
  const [status, setStatus] = useState<AuthStatus>("loading");

  const fetchProfile = useCallback(
    async (authUser: User) => {
      const { data } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .maybeSingle();

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

      setProfile({
        id: authUser.id,
        email: (data?.email as string) ?? authUser.email ?? null,
        name: (data?.name as string) ?? fallbackName,
        username: (data?.username as string) ?? fallbackUsername,
        avatar_url:
          (data?.avatar_url as string | null) ??
          (meta.avatar_url as string | null) ??
          null,
        sex: (data?.sex as "male" | "female" | null) ?? null,
        age: (data?.age as number | null) ?? null,
        weight_kg: (data?.weight_kg as number | null) ?? null,
        height_cm: (data?.height_cm as number | null) ?? null,
        activity_level: (data?.activity_level as string | null) ?? null,
        onboarding_done: (data?.onboarding_done as boolean | null) ?? null,
        created_at:
          (data?.created_at as string) ??
          authUser.created_at ??
          new Date().toISOString(),
      });
    },
    [supabase]
  );

  // Listen for auth state changes
  useEffect(() => {
    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user);
          setStatus("authenticated");
        } else {
          setStatus("unauthenticated");
        }
      })
      .catch(() => {
        setStatus("unauthenticated");
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user);
        setStatus("authenticated");
      } else {
        setUser(null);
        setProfile(null);
        setStatus("unauthenticated");
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, fetchProfile]);

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
    setStatus("unauthenticated");
    router.replace("/login");
  }, [supabase, router]);

  return (
    <AuthContext.Provider
      value={{ user, profile, status, supabase, login, loginWithGoogle, register, logout, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}
