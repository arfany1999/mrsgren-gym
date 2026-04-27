// Visual metadata layered onto TROPHIES. Kept separate so the data-only
// trophies.ts module stays import-cheap for places that just need progress.

import type { TrophyTier } from "./trophies";

export interface TierMeta {
  /** 4-stop gradient: [highlight, mid, shadow, deep-shadow]. */
  grad: [string, string, string, string];
  /** Neon-glow color used for radial backdrops + drop-shadow filters. */
  glow: string;
  /** Short hero copy under the badge. */
  desc: string;
  /** Italic pull-quote shown on the tier card. */
  quote: string;
  /** Reward bullets unlocked at this tier. */
  rewards: string[];
}

export const TIER_META: Record<TrophyTier, TierMeta> = {
  bronze: {
    grad: ["#B87333", "#CD7F32", "#8B5E3C", "#6B3A1F"],
    glow: "rgba(205, 127, 50, 0.5)",
    desc: "You showed up. Most can't even do that.",
    quote: "60 days. The foundation is set.",
    rewards: ["Bronze emblem", "Export PDF", "Avatar border"],
  },
  silver: {
    grad: ["#E8E8E8", "#C0C0C0", "#A8A8A8", "#707070"],
    glow: "rgba(192, 192, 192, 0.5)",
    desc: "Six months in. Most have already quit.",
    quote: "Discipline is choosing what you want most over what you want now.",
    rewards: ["Silver emblem", "Muscle heatmap", "Share links", "All Bronze rewards"],
  },
  gold: {
    grad: ["#FFD700", "#F0C420", "#DAA520", "#8B6914"],
    glow: "rgba(255, 215, 0, 0.5)",
    desc: "One year. This badge is not given. It is taken.",
    quote: "365 days. Zero excuses. Absolute discipline.",
    rewards: ["Gold emblem", "Advanced analytics", "AI overload insights", "All Silver rewards"],
  },
  ice: {
    grad: ["#E0F7FA", "#80DEEA", "#4FC3F7", "#0277BD"],
    glow: "rgba(79, 195, 247, 0.5)",
    desc: "18 months. Cold. Calculated. Unshakeable.",
    quote: "You don't train because you want to. You train because you are.",
    rewards: ["Ice emblem", "Priority features", "Custom themes", "All Gold rewards"],
  },
  diamond: {
    grad: ["#F5F5F5", "#E0E0E0", "#B0B0B0", "#9575CD"],
    glow: "rgba(176, 176, 176, 0.5)",
    desc: "Two years. Less than 1% will ever see this.",
    quote: "Permanent. Unquestionable. Diamond is forever.",
    rewards: ["Diamond emblem", "Lifetime archive", "Early access forever", "All Ice rewards"],
  },
};
