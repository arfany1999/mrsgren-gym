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
  email: string;
  name: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
}

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  status: AuthStatus;
  supabase: ReturnType<typeof createClient>;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
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
    async (userId: string) => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      setProfile(data);
    },
    [supabase]
  );

  // Listen for auth state changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        setStatus("authenticated");
        fetchProfile(session.user.id);
      } else {
        setStatus("unauthenticated");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        setStatus("authenticated");
        fetchProfile(session.user.id);
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

  const register = useCallback(
    async (d: RegisterData) => {
      const { data, error } = await supabase.auth.signUp({
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

      // Create profile row
      if (data.user) {
        await supabase.from("profiles").upsert({
          id: data.user.id,
          email: d.email,
          name: d.name,
          username: d.username,
        });
      }
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
      value={{ user, profile, status, supabase, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
