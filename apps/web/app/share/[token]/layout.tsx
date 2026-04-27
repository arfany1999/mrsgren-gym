import type { Metadata } from "next";

// Override the global fixed-position body so the share card flows naturally
// at any aspect ratio. Also lifts the AppShell wrapper that the (app) group
// would otherwise nest us inside — share is public, no auth, no chrome.
export const metadata: Metadata = {
  title: "GYM — Workout Card",
  description: "A training session shared from gym.mrgren.store.",
  openGraph: {
    title: "GYM — Workout Card",
    description: "A training session shared from gym.mrgren.store.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GYM — Workout Card",
    description: "A training session shared from gym.mrgren.store.",
  },
  robots: { index: false, follow: false },
};

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
