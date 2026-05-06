"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { AppShell } from "@/components/layout/AppShell/AppShell";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import { getProfile } from "@/lib/gymProfile";
import styles from "./layout.module.css";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { status, user, profile, profileReady } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (status === "authenticated" && user?.email && profileReady) {
      const localProfile = getProfile(user.email);
      if (!profile?.onboarding_done && !localProfile) {
        router.replace("/onboarding");
      }
    }
  }, [status, user, profile, profileReady, router]);

  if (status === "loading") {
    return (
      <div className={styles.loading}>
        <Spinner size={36} />
      </div>
    );
  }

  if (status === "unauthenticated") return null;

  if (!profileReady) {
    return (
      <div className={styles.loading}>
        <Spinner size={36} />
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
