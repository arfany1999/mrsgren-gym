"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/Input/Input";
import { Button } from "@/components/ui/Button/Button";
import { HALogo } from "@/components/branding/HALogo/HALogo";
import styles from "./page.module.css";

const FEATURES = [
  { icon: "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2", label: "Track every set, rep & PR" },
  { icon: "M13 10V3L4 14h7v7l9-11h-7z", label: "Smart rest & warmup tools" },
  { icon: "M3 3v18h18M7 16l4-4 4 4 5-5", label: "Visual progress analytics" },
];

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({ name: "", username: "", email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState("");
  const [loading, setLoading] = useState(false);

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
      {/* ── Left hero panel (desktop only) ── */}
      <div className={styles.hero}>
        <span className={styles.heroGlow} aria-hidden />
        <div className={styles.heroContent}>
          <div className={styles.heroLogo}>
            <HALogo size={72} />
          </div>
          <h1 className={styles.heroTitle}>GYM</h1>
          <p className={styles.heroTagline}>Track. Lift. Grow.</p>

          <div className={styles.features}>
            {FEATURES.map((f) => (
              <div key={f.label} className={styles.feature}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className={styles.featureIcon}>
                  <path d={f.icon} stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className={styles.heroFooter}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" style={{ display: "inline", verticalAlign: "middle", marginRight: 5 }}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          </svg>
          Secured by Hamidreza Arfany
        </p>
      </div>

      {/* ── Right form panel ── */}
      <div className={styles.formPanel}>
        <span className={styles.glowA} aria-hidden />
        <span className={styles.glowB} aria-hidden />

        <div className={styles.formInner}>
          {/* Mobile-only branding */}
          <div className={styles.mobileBrand}>
            <HALogo size={56} />
            <h1 className={styles.mobileTitle}>GYM</h1>
          </div>

          <div className={styles.formHeader}>
            <h2 className={styles.formTitle}>Create Account</h2>
            <p className={styles.formSub}>Start tracking your workouts today</p>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.formRow}>
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
            </div>
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

          <p className={styles.footer}>
            Already have an account? <Link href="/login">Log in</Link>
          </p>

          <p className={styles.signature}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
            Secured by Hamidreza Arfany
          </p>
        </div>
      </div>
    </div>
  );
}
