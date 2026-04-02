"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
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
  const displayName =
    profile?.name ||
    (user?.user_metadata?.name as string) ||
    (user?.user_metadata?.full_name as string) ||
    user?.email?.split("@")[0] ||
    "Athlete";
  const displayUsername =
    profile?.username ||
    (user?.user_metadata?.username as string) ||
    user?.email?.split("@")[0] ||
    null;
  const displayEmail = profile?.email || user?.email || "—";

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.headerName}>{displayUsername || displayName}</h1>
        <div className={styles.headerActions}>
          <button type="button" className={styles.iconBtn} aria-label="Edit">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M4 20h4l10-10-4-4L4 16v4z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button type="button" className={styles.iconBtn} aria-label="Share">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 4v12M8 8l4-4 4 4M5 14v4a2 2 0 002 2h10a2 2 0 002-2v-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button type="button" className={styles.iconBtn} aria-label="Settings">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M19 12a7 7 0 00-.07-1l2-1.5-2-3.5-2.4 1a7.6 7.6 0 00-1.7-1L14.5 3h-5l-.34 2.5a7.6 7.6 0 00-1.7 1l-2.4-1-2 3.5 2 1.5a7 7 0 000 2l-2 1.5 2 3.5 2.4-1a7.6 7.6 0 001.7 1L9.5 21h5l.34-2.5a7.6 7.6 0 001.7-1l2.4 1 2-3.5-2-1.5c.05-.33.07-.66.07-1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.avatar}>{(displayName[0] ?? "U").toUpperCase()}</div>
        <div className={styles.heroMeta}>
          <h2 className={styles.name}>{displayName}</h2>
          <div className={styles.statsInline}>
            <span><b>{totalWorkouts}</b> Workouts</span>
            <span><b>0</b> Followers</span>
            <span><b>0</b> Following</span>
          </div>
        </div>
      </section>

      <div className={styles.profileBanner}>
        Your profile is 80% finished
      </div>

      <section className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <p className={styles.chartLabel}>0 hours this week</p>
          <p className={styles.chartRange}>Last 3 months</p>
        </div>
        <div className={styles.bars}>
          <span className={styles.bar} />
          <span className={[styles.bar, styles.tall].join(" ")} />
          <span className={[styles.bar, styles.mid].join(" ")} />
          <span className={[styles.bar, styles.low].join(" ")} />
        </div>
        <div className={styles.segmented}>
          <button type="button" className={[styles.segBtn, styles.segActive].join(" ")}>Duration</button>
          <button type="button" className={styles.segBtn}>Volume</button>
          <button type="button" className={styles.segBtn}>Reps</button>
        </div>
      </section>

      <section className={styles.dashboard}>
        <h3 className={styles.sectionTitle}>Dashboard</h3>
        <div className={styles.grid}>
          <div className={styles.tile}>Statistics</div>
          <div className={styles.tile}>Exercises</div>
          <div className={styles.tile}>Measures</div>
          <div className={styles.tile}>Calendar</div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionLabel}>Account</div>
        <div className={styles.card}>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Name</span>
            <span className={styles.rowValue}>{displayName}</span>
          </div>
          <div className={styles.separator} />
          <div className={styles.row}>
            <span className={styles.rowLabel}>Username</span>
            <span className={styles.rowValue}>{displayUsername ? `@${displayUsername}` : "—"}</span>
          </div>
          <div className={styles.separator} />
          <div className={styles.row}>
            <span className={styles.rowLabel}>Email</span>
            <span className={styles.rowValue}>{displayEmail}</span>
          </div>
          <div className={styles.separator} />
          <div className={styles.row}>
            <span className={styles.rowLabel}>Member Since</span>
            <span className={styles.rowValue}>{joinDate}</span>
          </div>
        </div>
      </section>

      {loading && (
        <div className={styles.loadingCenter}><Spinner size={24} /></div>
      )}

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
