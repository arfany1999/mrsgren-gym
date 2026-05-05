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

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

  return (
    <div className={styles.page}>
      {/* ── Left hero panel (tablet + desktop) ── */}
      <div className={styles.hero}>
        <span className={styles.heroGlow} aria-hidden />
        {/* Decorative barbell outline */}
        <svg className={styles.heroDeco} viewBox="0 0 200 200" fill="none" aria-hidden>
          <circle cx="100" cy="100" r="90" stroke="var(--accent)" strokeWidth="0.4" opacity="0.08" />
          <circle cx="100" cy="100" r="60" stroke="var(--accent)" strokeWidth="0.3" opacity="0.06" />
          <circle cx="100" cy="100" r="30" stroke="var(--accent)" strokeWidth="0.3" opacity="0.04" />
          {/* barbell */}
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
                <div className={styles.featureDot} />
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
            <h2 className={styles.formTitle}>Welcome back</h2>
            <p className={styles.formSub}>Sign in to continue your journey</p>
          </div>

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
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />

            {error && <p className={styles.errorMsg}>{error}</p>}

            <Button type="submit" fullWidth loading={loading} size="lg">
              Log In
            </Button>
          </form>

          <p className={styles.footer}>
            Don&apos;t have an account?{" "}
            <Link href="/register">Sign up</Link>
          </p>

          {/* Mobile-only signature */}
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
