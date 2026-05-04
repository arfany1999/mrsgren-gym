const STANDARD_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25] as const;
const DEFAULT_BAR_WEIGHT = 20;

export function calculatePlates(
  targetWeight: number,
  barWeight: number = DEFAULT_BAR_WEIGHT
): { perSide: { plate: number; count: number }[]; remainder: number } {
  if (targetWeight <= barWeight) {
    return { perSide: [], remainder: 0 };
  }

  let remaining = (targetWeight - barWeight) / 2;
  const perSide: { plate: number; count: number }[] = [];

  for (const plate of STANDARD_PLATES) {
    if (remaining >= plate) {
      const count = Math.floor(remaining / plate);
      perSide.push({ plate, count });
      remaining = Math.round((remaining - plate * count) * 100) / 100; // avoid float drift
    }
  }

  return {
    perSide,
    remainder: Math.round(remaining * 2 * 100) / 100, // total unloadable (both sides)
  };
}

export function formatPlates(plates: { plate: number; count: number }[]): string {
  if (plates.length === 0) return "No plates";
  return plates.map((p) => `${p.count}×${p.plate}`).join(" + ");
}
