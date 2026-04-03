"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./BottomNav.module.css";

function IconFeed({ active }: { active: boolean }) {
  const c = active ? "var(--accent)" : "var(--text-tertiary)";
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1v-9.5z" stroke={c} strokeWidth="1.7" strokeLinejoin="round" fill={active ? "var(--accent-dim)" : "none"} />
      <path d="M9 21V13h6v8" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconRoutines({ active }: { active: boolean }) {
  const c = active ? "var(--accent)" : "var(--text-tertiary)";
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="9" width="4.5" height="6" rx="1.2" stroke={c} strokeWidth="1.7" />
      <rect x="16.5" y="9" width="4.5" height="6" rx="1.2" stroke={c} strokeWidth="1.7" />
      <rect x="7.5" y="10.5" width="9" height="3" rx="1.5" stroke={c} strokeWidth="1.7" />
    </svg>
  );
}

function IconExercises({ active }: { active: boolean }) {
  const c = active ? "var(--accent)" : "var(--text-tertiary)";
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M4 6h16M4 10h16M4 14h10M4 18h7" stroke={c} strokeWidth="1.7" strokeLinecap="round" />
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
  { href: "/dashboard", label: "Feed", Icon: IconFeed },
  { href: "/routines", label: "Routines", Icon: IconRoutines },
  { href: "/exercises", label: "Exercises", Icon: IconExercises },
  { href: "/profile", label: "Profile", Icon: IconProfile },
];

export function BottomNav() {
  const pathname = usePathname();

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <nav className={styles.nav} role="navigation" aria-label="Main navigation">
      {TABS.map(({ href, label, Icon }) => (
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
