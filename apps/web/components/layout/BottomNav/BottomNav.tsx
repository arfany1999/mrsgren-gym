"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useWorkout } from "@/contexts/WorkoutContext";
import styles from "./BottomNav.module.css";

function IconHome({ active }: { active: boolean }) {
  const c = active ? "var(--accent)" : "var(--text-tertiary)";
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1v-9.5z"
        stroke={c}
        strokeWidth="1.7"
        strokeLinejoin="round"
        fill={active ? "var(--accent-dim)" : "none"}
      />
      <path
        d="M9 21V13h6v8"
        stroke={c}
        strokeWidth="1.7"
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
      <path
        d="M12 8v4l2.5 2.5"
        stroke={c}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.05 11a9 9 0 101.42-4.65L2 4v4h4l-1.37-1.37A7 7 0 103.05 11z"
        stroke={c}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconRoutines({ active }: { active: boolean }) {
  const c = active ? "var(--accent)" : "var(--text-tertiary)";
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="3" width="16" height="18" rx="2" stroke={c} strokeWidth="1.7" />
      <path d="M8 8h8M8 12h8M8 16h5" stroke={c} strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function IconProfile({ active }: { active: boolean }) {
  const c = active ? "var(--accent)" : "var(--text-tertiary)";
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="7.5" r="3.5" stroke={c} strokeWidth="1.7" />
      <path d="M3.5 20.5c0-4.14 3.81-7.5 8.5-7.5s8.5 3.36 8.5 7.5" stroke={c} strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

const TABS = [
  { href: "/dashboard", label: "Home",     Icon: IconHome     },
  { href: "/workouts",  label: "History",  Icon: IconHistory  },
  { href: "/routines",  label: "Routines", Icon: IconRoutines },
  { href: "/profile",   label: "Profile",  Icon: IconProfile  },
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
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M8 5.5l10 6.5-10 6.5V5.5z" fill="#000" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
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
