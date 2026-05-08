"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import styles from "./page.module.css";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const errorParam = url.searchParams.get("error_description") || url.searchParams.get("error");

    if (errorParam) {
      router.replace(`/login?error=${encodeURIComponent(errorParam)}`);
      return;
    }

    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        router.replace(error ? `/login?error=${encodeURIComponent(error.message)}` : "/dashboard");
      });
    } else {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className={styles.page}>
      <div className={styles.spinner} />
      <p className={styles.text}>Signing you in&hellip;</p>
    </div>
  );
}
