"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useWorkout } from "@/contexts/WorkoutContext";
import styles from "./BottomNav.module.css";

function IconHome({ active }: { active: boolean }) {
  const c = active ? "var(--accent)" : "var(--text-tertiary)";
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M3 12L12 3L21 12M5 10V20H19V10" stroke={c} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconRoutines({ active }: { active: boolean }) {
  const c = active ? "var(--accent)" : "var(--text-tertiary)";
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="4" width="16" height="16" rx="3" stroke={c} strokeWidth="2.2"/>
      <path d="M8 9h8M8 13h8M8 17h5" stroke={c} strokeWidth="2.2" strokeLinecap="round"/>
    </svg>
  );
}

function IconStats({ active }: { active: boolean }) {
  const c = active ? "var(--accent)" : "var(--text-tertiary)";
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M4 20L4 14M10 20V8M16 20V4M22 20V12" stroke={c} strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  );
}

function IconProfile({ active }: { active: boolean }) {
  const c = active ? "var(--accent)" : "var(--text-tertiary)";
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" stroke={c} strokeWidth="2.4" />
      <path d="M4 20C4 16 8 14 12 14C16 14 20 16 20 20" stroke={c} strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function IconWorkout() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="2" y="9" width="3.5" height="6" rx="1" fill="currentColor"/>
      <rect x="18.5" y="9" width="3.5" height="6" rx="1" fill="currentColor"/>
      <rect x="6" y="10.5" width="12" height="3" rx="1" fill="currentColor"/>
    </svg>
  );
}

const LEFT_TABS = [
  { href: "/dashboard", label: "Home",     Icon: IconHome },
  { href: "/routines",  label: "Routines", Icon: IconRoutines },
];
const RIGHT_TABS = [
  { href: "/statistics", label: "Stats",   Icon: IconStats },
  { href: "/profile",    label: "Profile", Icon: IconProfile },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { activeWorkout, startWorkout } = useWorkout();

  function isActive(href: string) {
    if (href === "/routines") {
      return pathname === "/routines" || pathname.startsWith("/routines/");
    }
    if (href === "/statistics") {
      return pathname === "/statistics";
    }
    return pathname === href || pathname.startsWith(href + "/");
  }

  async function handleWorkoutFab() {
    if (activeWorkout?.id) {
      router.push("/active");
      return;
    }
    await startWorkout();
    router.push("/active");
  }

  const hasActive = !!activeWorkout?.id;
  const fabLabel = hasActive ? "Resume" : "Start";

  return (
    <nav className={styles.nav} role="navigation" aria-label="Main navigation">
      {LEFT_TABS.map(({ href, label, Icon }) => {
        const active = isActive(href);
        return (
          <Link key={href} href={href} className={[styles.tab, active ? styles.activeTab : ""].join(" ")}>
            {active && <span className={styles.activeIndicator} />}
            <span className={styles.tabIcon}><Icon active={active} /></span>
            <span className={[styles.label, active ? styles.activeLabel : ""].join(" ")}>{label}</span>
          </Link>
        );
      })}

      <div className={styles.fabSlot}>
        <button
          type="button"
          onClick={handleWorkoutFab}
          className={[styles.fab, hasActive ? styles.fabActive : ""].join(" ")}
          aria-label={hasActive ? "Resume active workout" : "Start a new workout"}
        >
          <span className={styles.fabIcon}><IconWorkout /></span>
        </button>
        <span className={styles.fabLabel}>{fabLabel}</span>
      </div>

      {RIGHT_TABS.map(({ href, label, Icon }) => {
        const active = isActive(href);
        return (
          <Link key={href} href={href} className={[styles.tab, active ? styles.activeTab : ""].join(" ")}>
            {active && <span className={styles.activeIndicator} />}
            <span className={styles.tabIcon}><Icon active={active} /></span>
            <span className={[styles.label, active ? styles.activeLabel : ""].join(" ")}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
