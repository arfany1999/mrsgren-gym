"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { AppShell } from "@/components/layout/AppShell/AppShell";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import styles from "./layout.module.css";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className={styles.loading}>
        <Spinner size={36} />
      </div>
    );
  }

  if (status === "unauthenticated") return null;

  return <AppShell>{children}</AppShell>;
}
