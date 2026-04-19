// Sub-region classifier for exercises.
//
// The free-exercise-db only labels coarse primary muscles ("chest", "shoulders",
// "abdominals"). This module adds a second-level classification based on the
// exercise name, so the UI can filter "Chest → Upper" (incline work) separately
// from "Chest → Lower" (decline, dips), and so on.
//
// Each sub-region also carries the specific body-muscles SVG IDs used to
// highlight just that part of the body on the thumbnail / detail view.

export interface SubRegion {
  id: string;           // e.g. "upper"
  label: string;        // e.g. "Upper"
  pattern: RegExp;      // matched against exercise.name
  front?: string[];     // body-muscles IDs on the front view
  back?: string[];      // body-muscles IDs on the back view
}

export interface SubRegionSet {
  muscle: string;       // primary muscle key (lowercase)
  regions: SubRegion[];
}

// Order matters within each muscle — classifier picks the FIRST pattern that
// matches, so more specific patterns should come before fallbacks.
const SUB_REGIONS: Record<string, SubRegion[]> = {
  chest: [
    {
      id: "upper",
      label: "Upper",
      pattern: /\bincline\b|\bhigh cable\b|\blow[- ]to[- ]high\b/i,
      front: ["chest-upper-left", "chest-upper-right"],
    },
    {
      id: "lower",
      label: "Lower",
      pattern: /\bdecline\b|\bdip(s|ping)?\b|\bhigh[- ]to[- ]low\b/i,
      front: ["chest-lower-left", "chest-lower-right"],
    },
    {
      id: "middle",
      label: "Middle",
      pattern: /.*/i, // everything else that's chest-primary
      front: [
        "chest-upper-left",
        "chest-upper-right",
        "chest-lower-left",
        "chest-lower-right",
      ],
    },
  ],

  shoulders: [
    {
      id: "rear",
      label: "Rear",
      pattern: /\brear\b|\breverse fly\b|\bface pull\b|\bbent[- ]over\b|\brear delt\b/i,
      back: ["deltoid-rear-left", "deltoid-rear-right"],
    },
    {
      id: "side",
      label: "Side",
      pattern: /\blateral raise\b|\bside raise\b|\bupright row\b|\bside lateral\b/i,
      front: ["shoulder-side-left", "shoulder-side-right"],
    },
    {
      id: "front",
      label: "Front",
      pattern: /\bfront raise\b|\bmilitary\b|\boverhead press\b|\bshoulder press\b|\barnold press\b|\bpush press\b|\bhandstand\b/i,
      front: ["shoulder-front-left", "shoulder-front-right"],
    },
  ],

  abdominals: [
    {
      id: "obliques",
      label: "Obliques",
      pattern: /\boblique\b|\brussian twist\b|\bside plank\b|\bside bend\b|\bwoodchop\b|\bwood chop\b|\btwist\b/i,
      front: ["obliques-left", "obliques-right"],
    },
    {
      id: "lower",
      label: "Lower",
      pattern: /\bleg raise\b|\bknee raise\b|\breverse crunch\b|\bhanging\b|\bmountain climber\b|\btoes to bar\b|\bflutter kick\b|\bscissor\b|\bv[- ]up\b/i,
      front: ["abs-lower-left", "abs-lower-right"],
    },
    {
      id: "upper",
      label: "Upper",
      pattern: /.*/i,
      front: ["abs-upper-left", "abs-upper-right"],
    },
  ],
};

export function getSubRegions(muscle: string): SubRegion[] {
  return SUB_REGIONS[muscle.toLowerCase()] ?? [];
}

export function classifySubRegion(
  exerciseName: string,
  muscle: string,
): SubRegion | null {
  const regions = getSubRegions(muscle);
  if (!regions.length) return null;
  return regions.find((r) => r.pattern.test(exerciseName)) ?? null;
}

export function matchesSubRegion(
  exerciseName: string,
  muscle: string,
  subId: string,
): boolean {
  if (!subId || subId === "all") return true;
  const region = classifySubRegion(exerciseName, muscle);
  return region?.id === subId;
}
