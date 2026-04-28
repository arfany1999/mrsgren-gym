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

export default function RegisterPage() {
  const { register, loginWithGoogle } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({ name: "", username: "", email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleGoogle() {
    setGlobalError("");
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "Google sign-in failed.");
      setGoogleLoading(false);
    }
  }

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: "" }));
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Name is required";
    if (!form.username.trim()) errs.username = "Username is required";
    else if (!/^[a-zA-Z0-9_]{3,30}$/.test(form.username))
      errs.username = "3-30 characters, letters, numbers, underscores only";
    if (!form.email.trim()) errs.email = "Email is required";
    if (!form.password) errs.password = "Password is required";
    else if (form.password.length < 8) errs.password = "At least 8 characters";
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGlobalError("");
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    try {
      await register(form);
      router.replace("/");
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <span className={styles.glowA} aria-hidden />
      <span className={styles.glowB} aria-hidden />
      <div className={styles.inner}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <HALogo size={72} />
          </div>
          <h1 className={styles.title}>Create Account</h1>
          <p className={styles.subtitle}>Start tracking your workouts</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <Input
            label="Full Name"
            placeholder="Your name"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            error={errors.name}
            autoComplete="name"
          />
          <Input
            label="Username"
            placeholder="your_username"
            value={form.username}
            onChange={(e) => set("username", e.target.value)}
            error={errors.username}
            autoComplete="username"
          />
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            error={errors.email}
            autoComplete="email"
          />
          <Input
            label="Password"
            type="password"
            placeholder="Min 8 characters"
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
            error={errors.password}
            autoComplete="new-password"
          />

          {globalError && <p className={styles.errorMsg}>{globalError}</p>}

          <Button type="submit" fullWidth loading={loading} size="lg">
            Create Account
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
          Already have an account? <Link href="/login">Log in</Link>
        </p>

        <InstallAppCard />
      </div>
    </div>
  );
}
