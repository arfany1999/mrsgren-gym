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

        <p className={styles.footer}>
          Already have an account? <Link href="/login">Log in</Link>
        </p>

        <InstallAppCard />
      </div>
    </div>
  );
}
