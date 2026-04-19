/* Hand-crafted muscle-group hero icons rendered as inline SVG.
 * All glyphs share a 24×24 viewBox, 2.2 stroke-width, currentColor strokes,
 * and subtle translucent fills so they read well on the gradient badge. */

type MuscleKey =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "legs"
  | "abs"
  | "cardio"
  | "default";

function resolveKey(muscles: string[]): MuscleKey {
  const first = (muscles[0] ?? "").toLowerCase();
  if (first.includes("chest"))                                             return "chest";
  if (first.includes("back") || first.includes("lat"))                     return "back";
  if (first.includes("shoulder") || first.includes("delt") || first.includes("trap")) return "shoulders";
  if (first.includes("bicep"))                                             return "biceps";
  if (first.includes("tricep") || first.includes("forearm"))               return "triceps";
  if (first.includes("quad") || first.includes("ham") || first.includes("glute")
      || first.includes("calf") || first.includes("leg"))                  return "legs";
  if (first.includes("ab") || first.includes("core"))                      return "abs";
  if (first.includes("cardio") || first.includes("heart"))                 return "cardio";
  return "default";
}

const SHARED = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const GLYPHS: Record<MuscleKey, React.ReactNode> = {
  /* Chest — two rounded pec plates with cleavage line */
  chest: (
    <>
      <path {...SHARED} d="M4 7h7c.6 0 1 .4 1 1v5c0 2.2-1.8 4-4 4H7c-1.7 0-3-1.3-3-3V7z"/>
      <path {...SHARED} d="M20 7h-7c-.6 0-1 .4-1 1v5c0 2.2 1.8 4 4 4h1c1.7 0 3-1.3 3-3V7z"/>
      <path stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" d="M12 8v9"/>
      <path stroke="currentColor" strokeWidth="1.6" opacity="0.6" strokeLinecap="round" d="M6.5 11.5c1.5-1 3-1 4.5 0M13 11.5c1.5-1 3-1 4.5 0"/>
    </>
  ),

  /* Back — V-shape lat spread */
  back: (
    <>
      <path {...SHARED} d="M4 5l8 5 8-5"/>
      <path {...SHARED} d="M4 10l8 5 8-5"/>
      <path {...SHARED} d="M4 15l8 5 8-5"/>
      <path stroke="currentColor" strokeWidth="1.4" opacity="0.55" strokeLinecap="round" d="M12 5v15"/>
    </>
  ),

  /* Shoulders — two rounded deltoid caps + neck */
  shoulders: (
    <>
      <path {...SHARED} d="M4 15c0-3.3 2.2-6 5-6h6c2.8 0 5 2.7 5 6"/>
      <circle {...SHARED} cx="6" cy="13" r="2.3"/>
      <circle {...SHARED} cx="18" cy="13" r="2.3"/>
      <path {...SHARED} d="M10 8.5c0-1.4 1-2.5 2-2.5s2 1.1 2 2.5"/>
      <path stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" d="M12 9v4"/>
    </>
  ),

  /* Biceps — flexed arm silhouette (L-shape with muscle bulge) */
  biceps: (
    <>
      {/* Upper arm going right, forearm going down */}
      <path {...SHARED} d="M3 8h7a3 3 0 013 3v3a4 4 0 01-4 4H5"/>
      {/* Bicep bulge on top of upper arm */}
      <path {...SHARED} d="M6 8c.5-2.5 2-4 4.5-4 2 0 3.5 1.2 3.5 3"/>
      {/* Wrist/fist */}
      <rect {...SHARED} x="4" y="17.5" width="4" height="3.5" rx="1"/>
    </>
  ),

  /* Triceps — horseshoe / U silhouette */
  triceps: (
    <>
      <path {...SHARED} d="M8 5v9c0 2.2 1.8 4 4 4s4-1.8 4-4V5"/>
      <path {...SHARED} d="M8 5h2.5M13.5 5H16"/>
      <path stroke="currentColor" strokeWidth="1.4" opacity="0.55" d="M10.5 9v4M13.5 9v4"/>
    </>
  ),

  /* Legs — two tapered legs with knee caps */
  legs: (
    <>
      <path {...SHARED} d="M8 4v6c0 1.5-.5 3-1 4.5-.5 1.3-.8 2.5-.8 3.5 0 1 .5 2 2 2"/>
      <path {...SHARED} d="M16 4v6c0 1.5.5 3 1 4.5.5 1.3.8 2.5.8 3.5 0 1-.5 2-2 2"/>
      <circle {...SHARED} cx="8" cy="11" r="1.4"/>
      <circle {...SHARED} cx="16" cy="11" r="1.4"/>
      <path stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" d="M5.5 20.5h4M14.5 20.5h4"/>
    </>
  ),

  /* Abs — six-pack grid */
  abs: (
    <>
      <rect {...SHARED} x="4.5" y="4.5" width="15" height="15" rx="3.5"/>
      <path stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" d="M12 4.8v14.4"/>
      <path stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" d="M5 9h14M5 14h14"/>
    </>
  ),

  /* Cardio — heart with pulse line */
  cardio: (
    <>
      <path {...SHARED} d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z"/>
      <path stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.95"
            d="M7 11h2l1.5-2.5L12 13l1.2-2 .8 1h2"/>
    </>
  ),

  /* Default — dumbbell */
  default: (
    <>
      <rect {...SHARED} x="2"  y="9"  width="3" height="6" rx="0.8"/>
      <rect {...SHARED} x="5"  y="7"  width="3" height="10" rx="1"/>
      <rect {...SHARED} x="16" y="7"  width="3" height="10" rx="1"/>
      <rect {...SHARED} x="19" y="9"  width="3" height="6" rx="0.8"/>
      <path stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" d="M8 12h8"/>
    </>
  ),
};

export function MuscleHero({ muscles, size = 20 }: { muscles: string[]; size?: number }) {
  const key = resolveKey(muscles);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      {GLYPHS[key]}
    </svg>
  );
}
