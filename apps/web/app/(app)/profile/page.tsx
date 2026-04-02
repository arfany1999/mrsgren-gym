"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { TopBar } from "@/components/layout/TopBar/TopBar";
import { Button } from "@/components/ui/Button/Button";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import { formatDateFull } from "@/lib/formatters";
import styles from "./page.module.css";

export default function ProfilePage() {
  const { profile, user, supabase, logout } = useAuth();
  const [totalWorkouts, setTotalWorkouts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const { count } = await supabase
          .from("workouts")
          .select("id", { count: "exact", head: true })
          .not("finished_at", "is", null);
        setTotalWorkouts(count ?? 0);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [supabase]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  }

  const joinDate = user?.created_at ? formatDateFull(user.created_at) : "—";

  return (
    <div className={styles.page}>
      <TopBar title="Profile" />

      {/* Avatar & Name */}
      <div className={styles.hero}>
        <div className={styles.avatar}>
          {(profile?.name?.[0] ?? "U").toUpperCase()}
        </div>
        <h1 className={styles.name}>{profile?.name}</h1>
        <p className={styles.username}>@{profile?.username}</p>
        <p className={styles.email}>{profile?.email}</p>
      </div>

      {/* Stats */}
      {loading ? (
        <div className={styles.loadingCenter}><Spinner size={24} /></div>
      ) : (
        <div className={styles.statsCard}>
          <div className={styles.stat}>
            <p className={styles.statVal}>{totalWorkouts}</p>
            <p className={styles.statLabel}>Workouts</p>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <p className={styles.statVal}>{joinDate}</p>
            <p className={styles.statLabel}>Member Since</p>
          </div>
        </div>
      )}

      {/* Settings / Actions */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>Account</div>
        <div className={styles.card}>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Name</span>
            <span className={styles.rowValue}>{profile?.name}</span>
          </div>
          <div className={styles.separator} />
          <div className={styles.row}>
            <span className={styles.rowLabel}>Username</span>
            <span className={styles.rowValue}>@{profile?.username}</span>
          </div>
          <div className={styles.separator} />
          <div className={styles.row}>
            <span className={styles.rowLabel}>Email</span>
            <span className={styles.rowValue}>{profile?.email}</span>
          </div>
        </div>
      </div>

      {/* About */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>About</div>
        <div className={styles.card}>
          <div className={styles.row}>
            <span className={styles.rowLabel}>App</span>
            <span className={styles.rowValue}>GYM Tracker</span>
          </div>
          <div className={styles.separator} />
          <div className={styles.row}>
            <span className={styles.rowLabel}>Version</span>
            <span className={styles.rowValue}>1.0.0</span>
          </div>
        </div>
      </div>

      {/* Logout */}
      <div className={styles.logoutSection}>
        <Button
          variant="danger"
          fullWidth
          onClick={handleLogout}
          loading={loggingOut}
        >
          Log Out
        </Button>
      </div>
    </div>
  );
}
