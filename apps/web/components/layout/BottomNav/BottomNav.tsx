"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useWorkout } from "@/contexts/WorkoutContext";
import styles from "./BottomNav.module.css";

function IconDashboard({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"
        stroke={active ? "var(--accent)" : "var(--text-tertiary)"}
        strokeWidth="1.8"
        strokeLinejoin="round"
        fill={active ? "var(--accent-dim)" : "none"}
      />
      <path
        d="M9 21V12h6v9"
        stroke={active ? "var(--accent)" : "var(--text-tertiary)"}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconHistory({ active }: { active: boolean }) {
  const c = active ? "var(--accent)" : "var(--text-tertiary)";
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="16" rx="2" stroke={c} strokeWidth="1.8" />
      <path d="M7 8h10M7 12h10M7 16h6" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconRoutines({ active }: { active: boolean }) {
  const c = active ? "var(--accent)" : "var(--text-tertiary)";
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" stroke={c} strokeWidth="1.8" />
      <rect x="9" y="3" width="6" height="4" rx="1" stroke={c} strokeWidth="1.8" />
      <path d="M9 12h6M9 16h4" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconProfile({ active }: { active: boolean }) {
  const c = active ? "var(--accent)" : "var(--text-tertiary)";
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" stroke={c} strokeWidth="1.8" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

const TABS = [
  { href: "/dashboard", label: "Home",     Icon: IconDashboard },
  { href: "/workouts",  label: "History",  Icon: IconHistory   },
  { href: "/routines",  label: "Routines", Icon: IconRoutines  },
  { href: "/profile",   label: "Profile",  Icon: IconProfile   },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { activeWorkout, startWorkout } = useWorkout();

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  async function handleStartWorkout() {
    if (activeWorkout) {
      router.push("/active");
    } else {
      await startWorkout();
      router.push("/active");
    }
  }

  return (
    <nav className={styles.nav} role="navigation" aria-label="Main navigation">
      {TABS.slice(0, 2).map(({ href, label, Icon }) => (
        <Link key={href} href={href} className={styles.tab}>
          <Icon active={isActive(href)} />
          <span className={[styles.label, isActive(href) ? styles.activeLabel : ""].join(" ")}>
            {label}
          </span>
        </Link>
      ))}

      {/* Center Start / Resume button */}
      <button
        className={[styles.startBtn, activeWorkout ? styles.resumeBtn : ""].join(" ")}
        onClick={handleStartWorkout}
        aria-label={activeWorkout ? "Resume workout" : "Start workout"}
        type="button"
      >
        {activeWorkout ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M10 8l6 4-6 4V8z" fill="#000" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="#000" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        )}
      </button>

      {TABS.slice(2).map(({ href, label, Icon }) => (
        <Link key={href} href={href} className={styles.tab}>
          <Icon active={isActive(href)} />
          <span className={[styles.label, isActive(href) ? styles.activeLabel : ""].join(" ")}>
            {label}
          </span>
        </Link>
      ))}
    </nav>
  );
}
