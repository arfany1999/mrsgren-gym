"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import type { User, AuthResponse } from "@/types/api";
import { authFetch, createApiClient, type ApiClient } from "@/lib/api";
import {
  getRefreshToken,
  setRefreshToken,
  clearRefreshToken,
  getStoredUser,
  setStoredUser,
  clearStoredUser,
} from "@/lib/storage";

// ── Types ─────────────────────────────────────────────────────
type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  api: ApiClient;
  getToken: () => string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<string | null>;
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
  const [user, setUser] = useState<User | null>(() => getStoredUser<User>());
  const [status, setStatus] = useState<AuthStatus>("loading");
  const accessTokenRef = useRef<string | null>(null);

  const getToken = useCallback((): string | null => {
    return accessTokenRef.current;
  }, []);

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    const rt = getRefreshToken();
    if (!rt) {
      setStatus("unauthenticated");
      return null;
    }
    try {
      const data = await authFetch<{ access: string; refresh: string }>("/auth/refresh", { refreshToken: rt });
      accessTokenRef.current = data.access;
      setRefreshToken(data.refresh);
      setStatus("authenticated");
      return data.access;
    } catch {
      clearRefreshToken();
      clearStoredUser();
      accessTokenRef.current = null;
      setUser(null);
      setStatus("unauthenticated");
      return null;
    }
  }, []);

  const onUnauthorized = useCallback(() => {
    clearRefreshToken();
    clearStoredUser();
    accessTokenRef.current = null;
    setUser(null);
    setStatus("unauthenticated");
    router.replace("/login");
  }, [router]);

  // Build the API client once
  const api = React.useMemo(
    () => createApiClient({ getToken, onRefresh: refreshAccessToken, onUnauthorized }),
    [getToken, refreshAccessToken, onUnauthorized]
  );

  // Silently restore session on mount
  useEffect(() => {
    refreshAccessToken();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async (email: string, password: string) => {
    const data = await authFetch<AuthResponse>("/auth/login", { email, password });
    accessTokenRef.current = data.access;
    setRefreshToken(data.refresh);
    setStoredUser(data.user);
    setUser(data.user);
    setStatus("authenticated");
  }, []);

  const register = useCallback(async (d: RegisterData) => {
    const data = await authFetch<AuthResponse>("/auth/register", d);
    accessTokenRef.current = data.access;
    setRefreshToken(data.refresh);
    setStoredUser(data.user);
    setUser(data.user);
    setStatus("authenticated");
  }, []);

  const logout = useCallback(async () => {
    const rt = getRefreshToken();
    if (rt) {
      try { await api.post("/auth/logout", { refreshToken: rt }); } catch { /* ignore */ }
    }
    clearRefreshToken();
    clearStoredUser();
    accessTokenRef.current = null;
    setUser(null);
    setStatus("unauthenticated");
    router.replace("/login");
  }, [api, router]);

  return (
    <AuthContext.Provider
      value={{ user, status, api, getToken, login, register, logout, refreshAccessToken }}
    >
      {children}
    </AuthContext.Provider>
  );
}
