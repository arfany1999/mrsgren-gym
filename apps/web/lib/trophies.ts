// ── Trophy tier system based on cumulative unique workout days ────────────────
// Progression: Bronze (60) → Silver (+120) → Gold (+180) → Ice (+180) → Diamond (+180)

export type TrophyTier = "bronze" | "silver" | "gold" | "ice" | "diamond";

export interface TrophyDef {
  tier: TrophyTier;
  label: string;
  image: string;
  threshold: number;   // cumulative workout days required
  segmentDays: number; // days of progress this tier alone represents
  blurb: string;
}

export const TROPHIES: TrophyDef[] = [
  {
    tier: "bronze",
    label: "Bronze",
    image: "/trophies/bronze.svg",
    threshold: 60,
    segmentDays: 60,
    blurb: "60 workout days",
  },
  {
    tier: "silver",
    label: "Silver",
    image: "/trophies/silver.svg",
    threshold: 180,
    segmentDays: 120,
    blurb: "4 months after Bronze",
  },
  {
    tier: "gold",
    label: "Gold",
    image: "/trophies/gold.svg",
    threshold: 360,
    segmentDays: 180,
    blurb: "6 months after Silver",
  },
  {
    tier: "ice",
    label: "Ice",
    image: "/trophies/ice.svg",
    threshold: 540,
    segmentDays: 180,
    blurb: "6 months after Gold",
  },
  {
    tier: "diamond",
    label: "Diamond",
    image: "/trophies/diamond.svg",
    threshold: 720,
    segmentDays: 180,
    blurb: "6 months after Ice",
  },
];

export interface TrophyProgress {
  currentTier: TrophyDef | null;     // highest tier already earned (null = none yet)
  nextTier: TrophyDef | null;         // next tier to aim for (null = all earned)
  daysIntoCurrent: number;            // days completed toward the next tier's segment
  daysRemaining: number;              // days left until next tier
  segmentPercent: number;             // 0..100 progress inside the current segment
  overallPercent: number;             // 0..100 toward Diamond
}

/**
 * Given total unique workout days, return the user's trophy progression state.
 */
export function getTrophyProgress(workoutDays: number): TrophyProgress {
  const days = Math.max(0, Math.floor(workoutDays));

  // Highest earned tier
  let currentTier: TrophyDef | null = null;
  for (const t of TROPHIES) {
    if (days >= t.threshold) currentTier = t;
  }

  // Next tier to earn (first unmet threshold)
  const nextTier = TROPHIES.find((t) => days < t.threshold) ?? null;

  if (!nextTier) {
    return {
      currentTier,
      nextTier: null,
      daysIntoCurrent: 0,
      daysRemaining: 0,
      segmentPercent: 100,
      overallPercent: 100,
    };
  }

  const segmentStart = currentTier?.threshold ?? 0;
  const segmentLength = nextTier.threshold - segmentStart;
  const daysIntoCurrent = Math.max(0, days - segmentStart);
  const daysRemaining = Math.max(0, nextTier.threshold - days);
  const segmentPercent = Math.min(100, (daysIntoCurrent / segmentLength) * 100);
  const overallPercent = Math.min(100, (days / TROPHIES[TROPHIES.length - 1]!.threshold) * 100);

  return {
    currentTier,
    nextTier,
    daysIntoCurrent,
    daysRemaining,
    segmentPercent,
    overallPercent,
  };
}

/** Short human label like "28 days to Silver" */
export function nextTierLabel(p: TrophyProgress): string {
  if (!p.nextTier) return "All trophies unlocked";
  const d = p.daysRemaining;
  return `${d} day${d === 1 ? "" : "s"} to ${p.nextTier.label}`;
}
