"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./BottomNav.module.css";

function IconHome({ active }: { active: boolean }) {
  const c = active ? "var(--accent)" : "var(--text-tertiary)";
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z" stroke={c} strokeWidth="1.8" strokeLinejoin="round"/>
      <path d="M9 21V12h6v9" stroke={c} strokeWidth="1.8" strokeLinejoin="round"/>
    </svg>
  );
}

function IconWorkout({ active }: { active: boolean }) {
  const c = active ? "var(--accent)" : "var(--text-tertiary)";
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="10" width="4" height="4" rx="1" stroke={c} strokeWidth="1.8"/>
      <rect x="18" y="10" width="4" height="4" rx="1" stroke={c} strokeWidth="1.8"/>
      <path d="M6 12h12" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
      <rect x="9" y="8" width="6" height="8" rx="1.5" stroke={c} strokeWidth="1.8"/>
    </svg>
  );
}

function IconProfile({ active }: { active: boolean }) {
  const c = active ? "var(--accent)" : "var(--text-tertiary)";
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="7.5" r="3.5" stroke={c} strokeWidth="1.8"/>
      <path d="M3.5 20.5c0-4.14 3.81-7.5 8.5-7.5s8.5 3.36 8.5 7.5" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

const TABS = [
  { href: "/dashboard", label: "Home",    Icon: IconHome },
  { href: "/routines",  label: "Workout", Icon: IconWorkout },
  { href: "/profile",   label: "Profile", Icon: IconProfile },
];

export function BottomNav() {
  const pathname = usePathname();

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <nav className={styles.nav} role="navigation" aria-label="Main navigation">
      {TABS.map(({ href, label, Icon }) => {
        const active = isActive(href);
        return (
          <Link key={href} href={href} className={[styles.tab, active ? styles.activeTab : ""].join(" ")}>
            <span className={styles.tabIcon}>
              <Icon active={active} />
            </span>
            <span className={[styles.label, active ? styles.activeLabel : ""].join(" ")}>
              {label}
            </span>
            {active && <span className={styles.activeIndicator} />}
          </Link>
        );
      })}
    </nav>
  );
}
