"use client";

import styles from "./MuscleMap.module.css";

// ── Muscle name → region IDs ──────────────────────────────────────
const MUSCLE_TO_REGIONS: Record<string, string[]> = {
  "pectorals":          ["lPec", "rPec"],
  "abs":                ["abs"],
  "delts":              ["lDelt", "rDelt"],
  "biceps":             ["lBicep", "rBicep"],
  "forearms":           ["lForearm", "rForearm"],
  "quads":              ["lQuad", "rQuad"],
  "calves":             ["lCalf", "rCalf"],
  "serratus anterior":  ["serratus"],
  "traps":              ["traps"],
  "lats":               ["lLat", "rLat"],
  "upper back":         ["upperBack"],
  "triceps":            ["lTricep", "rTricep"],
  "glutes":             ["lGlute", "rGlute"],
  "hamstrings":         ["lHam", "rHam"],
  "spine":              ["spine"],
  "levator scapulae":   ["traps"],
  "cardiovascular system": [],
};

// ── Region ellipses: [cx, cy, rx, ry] ────────────────────────────
// viewBox: 0 0 80 192
const FRONT_REGIONS: Record<string, [number, number, number, number]> = {
  lDelt:    [16, 44, 8, 10],
  rDelt:    [64, 44, 8, 10],
  lPec:     [33, 57, 9, 10],
  rPec:     [47, 57, 9, 10],
  serratus: [40, 71, 9, 6],
  abs:      [40, 87, 11, 18],
  lBicep:   [14, 57, 6, 12],
  rBicep:   [66, 57, 6, 12],
  lForearm: [13, 100, 6, 14],
  rForearm: [67, 100, 6, 14],
  lQuad:    [32, 141, 10, 20],
  rQuad:    [48, 141, 10, 20],
  lCalf:    [30, 176, 7, 12],
  rCalf:    [50, 176, 7, 12],
};

const BACK_REGIONS: Record<string, [number, number, number, number]> = {
  traps:     [40, 40, 20, 8],
  upperBack: [40, 54, 12, 9],
  lLat:      [30, 72, 9, 17],
  rLat:      [50, 72, 9, 17],
  spine:     [40, 86, 4, 23],
  lTricep:   [14, 57, 6, 12],
  rTricep:   [66, 57, 6, 12],
  lGlute:    [32, 123, 11, 10],
  rGlute:    [48, 123, 11, 10],
  lHam:      [32, 145, 10, 20],
  rHam:      [48, 145, 10, 20],
  lCalf:     [30, 176, 7, 12],
  rCalf:     [50, 176, 7, 12],
};

const FRONT_REGION_SET = new Set(Object.keys(FRONT_REGIONS));
const BACK_REGION_SET  = new Set(Object.keys(BACK_REGIONS));

// ── Body silhouette SVG ───────────────────────────────────────────
function Body() {
  return (
    <g fill="#1a1a1e" stroke="#2c2c30" strokeWidth="1.2" strokeLinejoin="round">
      {/* Left upper arm */}
      <path d="M 18 33 C 10 42 8 58 8 72 C 8 82 10 90 14 94 C 18 92 22 88 24 80 C 26 68 26 54 26 38 Z" />
      {/* Right upper arm */}
      <path d="M 62 33 C 70 42 72 58 72 72 C 72 82 70 90 66 94 C 62 92 58 88 56 80 C 54 68 54 54 54 38 Z" />
      {/* Left forearm */}
      <path d="M 8 95 C 6 106 6 116 8 122 C 10 126 14 126 18 124 C 20 120 22 114 22 104 C 22 96 20 92 16 93 Z" />
      {/* Right forearm */}
      <path d="M 72 95 C 74 106 74 116 72 122 C 70 126 66 126 62 124 C 60 120 58 114 58 104 C 58 96 60 92 64 93 Z" />
      {/* Left thigh */}
      <path d="M 24 124 C 20 136 18 150 20 162 C 22 168 28 170 34 168 C 38 166 42 160 42 148 C 42 136 42 128 38 124 Z" />
      {/* Right thigh */}
      <path d="M 56 124 C 60 136 62 150 60 162 C 58 168 52 170 46 168 C 42 166 38 160 38 148 C 38 136 38 128 42 124 Z" />
      {/* Left shin */}
      <path d="M 18 164 C 16 174 16 184 18 190 C 20 194 26 194 30 192 C 34 190 36 184 36 176 C 36 168 34 162 28 162 Z" />
      {/* Right shin */}
      <path d="M 62 164 C 64 174 64 184 62 190 C 60 194 54 194 50 192 C 46 190 44 184 44 176 C 44 168 46 162 52 162 Z" />
      {/* Torso — drawn on top so it covers arm/leg joints */}
      <path d="M 22 33 C 14 44 12 60 14 82 C 14 98 18 114 24 122 C 30 128 36 130 40 130 C 44 130 50 128 56 122 C 62 114 66 98 66 82 C 68 60 66 44 58 33 C 52 30 46 28 40 28 C 34 28 28 30 22 33 Z" />
      {/* Neck */}
      <ellipse cx="40" cy="23" rx="5" ry="5" />
      {/* Head */}
      <ellipse cx="40" cy="11" rx="10" ry="11" />
    </g>
  );
}

// ── Region ellipses with highlight state ─────────────────────────
function Regions({
  map,
  active,
}: {
  map: Record<string, [number, number, number, number]>;
  active: Set<string>;
}) {
  return (
    <>
      {Object.entries(map).map(([id, [cx, cy, rx, ry]]) => (
        <ellipse
          key={id}
          cx={cx} cy={cy} rx={rx} ry={ry}
          className={active.has(id) ? styles.regionActive : styles.region}
        />
      ))}
    </>
  );
}

// ── Public component ──────────────────────────────────────────────
interface MuscleMapProps {
  muscles: string[];
  /** "full" = both views (default). "compact" = one view only (whichever is most relevant). */
  variant?: "full" | "compact";
}

export function MuscleMap({ muscles, variant = "full" }: MuscleMapProps) {
  // Resolve muscle names → region IDs
  const activeIds = new Set<string>();
  for (const m of muscles) {
    for (const id of MUSCLE_TO_REGIONS[m.toLowerCase()] ?? []) {
      activeIds.add(id);
    }
  }

  const activeFront = new Set([...activeIds].filter((id) => FRONT_REGION_SET.has(id)));
  const activeBack  = new Set([...activeIds].filter((id) => BACK_REGION_SET.has(id)));

  const hasFront = activeFront.size > 0;
  const hasBack  = activeBack.size > 0;

  // In compact mode, pick the view with more active regions
  const showFront = variant === "full" || activeFront.size >= activeBack.size || (!hasFront && !hasBack);
  const showBack  = variant === "full" || activeBack.size  >  activeFront.size;

  return (
    <div className={variant === "compact" ? styles.wrapCompact : styles.wrap}>
      {showFront && (
        <div className={styles.view}>
          {variant === "full" && <span className={styles.label}>Front</span>}
          <svg viewBox="0 0 80 192" className={styles.svg} aria-hidden>
            <Body />
            <Regions map={FRONT_REGIONS} active={activeFront} />
          </svg>
        </div>
      )}
      {showBack && (
        <div className={styles.view}>
          {variant === "full" && <span className={styles.label}>Back</span>}
          <svg viewBox="0 0 80 192" className={styles.svg} aria-hidden>
            <Body />
            <Regions map={BACK_REGIONS} active={activeBack} />
          </svg>
        </div>
      )}
    </div>
  );
}
