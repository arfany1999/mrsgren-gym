"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/Input/Input";
import { Button } from "@/components/ui/Button/Button";
import { InstallAppCard } from "@/components/ui/InstallAppCard/InstallAppCard";
import { HALogo } from "@/components/branding/HALogo/HALogo";
import styles from "./page.module.css";

export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError("");
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      // signInWithOAuth redirects, no need to router.replace
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed.");
      setGoogleLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <span className={styles.glowA} aria-hidden />
      <span className={styles.glowB} aria-hidden />
      <div className={styles.inner}>
        {/* Logo / Title */}
        <div className={styles.header}>
          <div className={styles.logo}>
            <HALogo />
          </div>
          <h1 className={styles.title}>GYM</h1>
          <p className={styles.subtitle}>Your workout tracker</p>
        </div>

        {/* Form */}
        <form className={styles.form} onSubmit={handleSubmit}>
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />

          {error && <p className={styles.errorMsg}>{error}</p>}

          <Button type="submit" fullWidth loading={loading} size="lg">
            Log In
          </Button>
        </form>

        <div className={styles.dividerRow}>
          <span className={styles.dividerLine} />
          <span className={styles.dividerLabel}>OR</span>
          <span className={styles.dividerLine} />
        </div>

        <button
          type="button"
          className={styles.googleBtn}
          onClick={handleGoogle}
          disabled={googleLoading}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
            <path d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91a8.78 8.78 0 0 0 2.69-6.62Z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.46-.8 5.95-2.18l-2.91-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.93v2.33A9 9 0 0 0 9 18Z" fill="#34A853"/>
            <path d="M3.97 10.72A5.41 5.41 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.93A9 9 0 0 0 0 9c0 1.45.35 2.83.93 4.05l3.04-2.33Z" fill="#FBBC05"/>
            <path d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58A8.96 8.96 0 0 0 9 0 9 9 0 0 0 .93 4.95L3.97 7.28C4.68 5.16 6.66 3.58 9 3.58Z" fill="#EA4335"/>
          </svg>
          <span>{googleLoading ? "Redirecting…" : "Continue with Google"}</span>
        </button>

        <p className={styles.footer}>
          Don&apos;t have an account?{" "}
          <Link href="/register">Sign up</Link>
        </p>

        <InstallAppCard />

        <p className={styles.signature}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          </svg>
          Secured by Hamidreza Arfany
        </p>
      </div>
    </div>
  );
}
