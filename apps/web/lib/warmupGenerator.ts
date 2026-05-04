const DEFAULT_BAR_WEIGHT = 20;

function roundToNearest2_5(value: number): number {
  return Math.round(value / 2.5) * 2.5;
}

export function generateWarmupSets(
  workingWeight: number,
  workingReps: number,
  barWeight: number = DEFAULT_BAR_WEIGHT
): { weight: number; reps: number; label: string }[] {
  if (workingWeight <= barWeight) {
    return [{ weight: barWeight, reps: workingReps, label: "Bar only" }];
  }

  const sets: { weight: number; reps: number; label: string }[] = [];

  // Set 1: empty bar
  sets.push({ weight: barWeight, reps: 12, label: "Empty bar" });

  // Set 2: ~40%
  const w40 = Math.max(barWeight, roundToNearest2_5(workingWeight * 0.4));
  sets.push({ weight: w40, reps: 8, label: "~40%" });

  // Set 3: ~60%
  const w60 = Math.max(barWeight, roundToNearest2_5(workingWeight * 0.6));
  sets.push({ weight: w60, reps: 5, label: "~60%" });

  // Set 4: ~80% (only if working weight > 60)
  if (workingWeight > 60) {
    const w80 = Math.max(barWeight, roundToNearest2_5(workingWeight * 0.8));
    sets.push({ weight: w80, reps: 3, label: "~80%" });
  }

  // Set 5: ~90% (only if working weight > 100)
  if (workingWeight > 100) {
    const w90 = Math.max(barWeight, roundToNearest2_5(workingWeight * 0.9));
    sets.push({ weight: w90, reps: 1, label: "~90%" });
  }

  return sets;
}
