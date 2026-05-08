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
  { icon: "M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z", label: "Workout history & calendar" },
];

const STATS = [
  { value: "PR", label: "auto detect" },
  { value: "90s", label: "smart rest" },
  { value: "7d", label: "weekly volume" },
];

export default function RegisterPage() {
  const { register, loginWithGoogle } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({ name: "", username: "", email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
      await register({
        name: form.name.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      router.replace("/");
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setGlobalError("");
    setOauthLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      setOauthLoading(false);
      setGlobalError(err instanceof Error ? err.message : "Google sign-in failed. Please try again.");
    }
  }

  return (
    <div className={styles.page}>
      {/* ── Left hero panel (tablet + desktop) ── */}
      <div className={styles.hero}>
        <span className={styles.heroGlow} aria-hidden />
        <svg className={styles.heroDeco} viewBox="0 0 200 200" fill="none" aria-hidden>
          <circle cx="100" cy="100" r="90" stroke="var(--accent)" strokeWidth="0.4" opacity="0.08" />
          <circle cx="100" cy="100" r="60" stroke="var(--accent)" strokeWidth="0.3" opacity="0.06" />
          <circle cx="100" cy="100" r="30" stroke="var(--accent)" strokeWidth="0.3" opacity="0.04" />
          <rect x="30" y="95" width="140" height="10" rx="5" stroke="var(--accent)" strokeWidth="0.5" opacity="0.1" />
          <rect x="40" y="80" width="16" height="40" rx="3" stroke="var(--accent)" strokeWidth="0.5" opacity="0.08" />
          <rect x="144" y="80" width="16" height="40" rx="3" stroke="var(--accent)" strokeWidth="0.5" opacity="0.08" />
          <rect x="58" y="85" width="10" height="30" rx="2" stroke="var(--accent)" strokeWidth="0.4" opacity="0.06" />
          <rect x="132" y="85" width="10" height="30" rx="2" stroke="var(--accent)" strokeWidth="0.4" opacity="0.06" />
        </svg>

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

          <div className={styles.heroPreview} aria-hidden>
            <div className={styles.previewHeader}>
              <span>Starter plan</span>
              <strong>Build Week 1</strong>
            </div>
            <div className={styles.previewMetric}>
              <span className={styles.previewValue}>4 workouts</span>
              <span className={styles.previewDelta}>ready</span>
            </div>
            <div className={styles.previewBars}>
              <span style={{ height: "54%" }} />
              <span style={{ height: "76%" }} />
              <span style={{ height: "48%" }} />
              <span style={{ height: "88%" }} />
              <span style={{ height: "66%" }} />
            </div>
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

          <div className={styles.quickStats} aria-label="App highlights">
            {STATS.map((stat) => (
              <div key={stat.label} className={styles.quickStat}>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <button
              type="button"
              className={styles.googleBtn}
              onClick={handleGoogleSignIn}
              disabled={oauthLoading || loading}
            >
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.2 4 9.5 8.4 6.3 14.7z" />
                <path fill="#4CAF50" d="M24 44c5.1 0 9.8-2 13.3-5.2l-6.1-5.1C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.3 39.6 16.1 44 24 44z" />
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.1 5.7l6.1 5.1C36.9 39.1 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
              </svg>
              {oauthLoading ? "Connecting..." : "Continue with Google"}
            </button>

            <div className={styles.divider}><span>or create with email</span></div>

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
              type={showPassword ? "text" : "password"}
              placeholder="Min 8 characters"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              error={errors.password}
              autoComplete="new-password"
              rightElement={
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              }
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
