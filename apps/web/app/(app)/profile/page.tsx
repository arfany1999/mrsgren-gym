"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { TopBar } from "@/components/layout/TopBar/TopBar";
import { Button } from "@/components/ui/Button/Button";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import type { Workout } from "@/types/api";
import { formatDateFull } from "@/lib/formatters";
import styles from "./page.module.css";

export default function ProfilePage() {
  const { user, api, logout } = useAuth();
  const [stats, setStats] = useState({ totalWorkouts: 0, totalSets: 0, joinedAt: "" });
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    api
      .get<{ workouts: Workout[]; total: number }>("/workouts?limit=1")
      .then((res) => {
        setStats((s) => ({ ...s, totalWorkouts: res.total }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [api]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  }

  const joinDate = user?.createdAt ? formatDateFull(user.createdAt) : "—";

  return (
    <div className={styles.page}>
      <TopBar title="Profile" />

      {/* Avatar & Name */}
      <div className={styles.hero}>
        <div className={styles.avatar}>
          {(user?.name?.[0] ?? "U").toUpperCase()}
        </div>
        <h1 className={styles.name}>{user?.name}</h1>
        <p className={styles.username}>@{user?.username}</p>
        <p className={styles.email}>{user?.email}</p>
      </div>

      {/* Stats */}
      {loading ? (
        <div className={styles.loadingCenter}><Spinner size={24} /></div>
      ) : (
        <div className={styles.statsCard}>
          <div className={styles.stat}>
            <p className={styles.statVal}>{stats.totalWorkouts}</p>
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
            <span className={styles.rowValue}>{user?.name}</span>
          </div>
          <div className={styles.separator} />
          <div className={styles.row}>
            <span className={styles.rowLabel}>Username</span>
            <span className={styles.rowValue}>@{user?.username}</span>
          </div>
          <div className={styles.separator} />
          <div className={styles.row}>
            <span className={styles.rowLabel}>Email</span>
            <span className={styles.rowValue}>{user?.email}</span>
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
