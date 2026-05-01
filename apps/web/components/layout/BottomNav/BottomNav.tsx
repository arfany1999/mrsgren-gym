"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./BottomNav.module.css";

function IconHome({ active }: { active: boolean }) {
  const c = active ? "var(--accent)" : "var(--text-tertiary)";
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <path d="M3 12L12 3L21 12M5 10V20H19V10" stroke={c} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconHistory({ active }: { active: boolean }) {
  const c = active ? "var(--accent)" : "var(--text-tertiary)";
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="18" rx="3" stroke={c} strokeWidth="2.4" />
      <path d="M3 9H21M8 2V5M16 2V5" stroke={c} strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function IconStats({ active }: { active: boolean }) {
  const c = active ? "var(--accent)" : "var(--text-tertiary)";
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <path d="M4 20L4 14M10 20V8M16 20V4M22 20V12" stroke={c} strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  );
}

function IconProfile({ active }: { active: boolean }) {
  const c = active ? "var(--accent)" : "var(--text-tertiary)";
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" stroke={c} strokeWidth="2.4" />
      <path d="M4 20C4 16 8 14 12 14C16 14 20 16 20 20" stroke={c} strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

const TABS = [
  { href: "/dashboard",  label: "Home",    Icon: IconHome },
  { href: "/workouts",   label: "History", Icon: IconHistory },
  { href: "/statistics", label: "Stats",   Icon: IconStats },
  { href: "/profile",    label: "Profile", Icon: IconProfile },
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
            {active && <span className={styles.activeIndicator} />}
            <span className={styles.tabIcon}>
              <Icon active={active} />
            </span>
            <span className={[styles.label, active ? styles.activeLabel : ""].join(" ")}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
