// ── Curated exercise database ─────────────────────────────────
// Single source of truth for exercises shown in the routine builder.

export type MeasurementType =
  | "weight_reps"      // Sets × Reps × Weight kg  (most strength work)
  | "bodyweight_reps"  // Sets × Reps  (no weight)
  | "timed"            // Sets × Duration in seconds  (planks, holds)
  | "cardio"           // Duration (min) + Distance (km)
  | "reps_only";       // Sets × Reps  (explosive / circuit)

export interface ExerciseDef {
  name: string;
  muscle: string;      // matches muscle_group in DB
  type: MeasurementType;
}

// ── Muscle group chips shown in the picker ────────────────────
export const MUSCLE_GROUPS: { id: string; label: string; emoji: string }[] = [
  { id: "chest",      label: "Chest",      emoji: "🫀" },
  { id: "back",       label: "Back",       emoji: "🔙" },
  { id: "triceps",    label: "Triceps",    emoji: "🦾" },
  { id: "biceps",     label: "Biceps",     emoji: "💪" },
  { id: "forearms",   label: "Forearms",   emoji: "🖐️" },
  { id: "legs",       label: "Legs",       emoji: "🦵" },
  { id: "core",       label: "Core",       emoji: "🎯" },
  { id: "bodyweight", label: "Bodyweight", emoji: "🤸" },
  { id: "cardio",     label: "Cardio",     emoji: "🏃" },
];

// ── Full exercise list ────────────────────────────────────────
export const EXERCISES: ExerciseDef[] = [

  // ── CHEST ─────────────────────────────────────────────────
  { name: "Flat Barbell Bench Press",           muscle: "chest", type: "weight_reps" },
  { name: "Incline Barbell Bench Press",        muscle: "chest", type: "weight_reps" },
  { name: "Decline Barbell Bench Press",        muscle: "chest", type: "weight_reps" },
  { name: "Close-Grip Barbell Bench Press",     muscle: "chest", type: "weight_reps" },
  { name: "Barbell Pullover",                   muscle: "chest", type: "weight_reps" },
  { name: "Flat Dumbbell Bench Press",          muscle: "chest", type: "weight_reps" },
  { name: "Incline Dumbbell Bench Press",       muscle: "chest", type: "weight_reps" },
  { name: "Decline Dumbbell Bench Press",       muscle: "chest", type: "weight_reps" },
  { name: "Close-Grip Dumbbell Press",          muscle: "chest", type: "weight_reps" },
  { name: "Dumbbell Pullover",                  muscle: "chest", type: "weight_reps" },
  { name: "Dips",                               muscle: "chest", type: "bodyweight_reps" },

  // ── BACK ──────────────────────────────────────────────────
  { name: "Wide-Grip Lat Pulldown",             muscle: "back", type: "weight_reps" },
  { name: "Close-Grip Lat Pulldown",            muscle: "back", type: "weight_reps" },
  { name: "Reverse-Grip Lat Pulldown",          muscle: "back", type: "weight_reps" },
  { name: "Single-Arm Lat Pulldown",            muscle: "back", type: "weight_reps" },
  { name: "Straight-Arm Pulldown",              muscle: "back", type: "weight_reps" },
  { name: "Seated Cable Row (Wide Grip)",       muscle: "back", type: "weight_reps" },
  { name: "Seated Cable Row (Close Grip)",      muscle: "back", type: "weight_reps" },
  { name: "Single-Arm Cable Row",               muscle: "back", type: "weight_reps" },
  { name: "Cable Face Pull",                    muscle: "back", type: "weight_reps" },
  { name: "High Cable Row",                     muscle: "back", type: "weight_reps" },
  { name: "Pull-Up",                            muscle: "back", type: "bodyweight_reps" },

  // ── TRICEPS ───────────────────────────────────────────────
  { name: "Close-Grip Bench Press",             muscle: "triceps", type: "weight_reps" },
  { name: "Barbell Skull Crusher",              muscle: "triceps", type: "weight_reps" },
  { name: "Barbell Overhead Tricep Extension",  muscle: "triceps", type: "weight_reps" },
  { name: "Tricep Pushdown (Straight Bar)",     muscle: "triceps", type: "weight_reps" },
  { name: "Tricep Pushdown (Rope)",             muscle: "triceps", type: "weight_reps" },
  { name: "Reverse-Grip Pushdown",              muscle: "triceps", type: "weight_reps" },
  { name: "Overhead Cable Tricep Extension",    muscle: "triceps", type: "weight_reps" },
  { name: "Single-Arm Cable Pushdown",          muscle: "triceps", type: "weight_reps" },
  { name: "Dumbbell Skull Crusher",             muscle: "triceps", type: "weight_reps" },
  { name: "Overhead Dumbbell Tricep Extension", muscle: "triceps", type: "weight_reps" },
  { name: "Dumbbell Kickback",                  muscle: "triceps", type: "weight_reps" },
  { name: "Single-Arm Overhead Extension",      muscle: "triceps", type: "weight_reps" },

  // ── BICEPS ────────────────────────────────────────────────
  { name: "Barbell Curl",                       muscle: "biceps", type: "weight_reps" },
  { name: "EZ Bar Curl",                        muscle: "biceps", type: "weight_reps" },
  { name: "Reverse-Grip Barbell Curl",          muscle: "biceps", type: "weight_reps" },
  { name: "Drag Curl",                          muscle: "biceps", type: "weight_reps" },
  { name: "Dumbbell Bicep Curl",                muscle: "biceps", type: "weight_reps" },
  { name: "Hammer Curl",                        muscle: "biceps", type: "weight_reps" },
  { name: "Incline Dumbbell Curl",              muscle: "biceps", type: "weight_reps" },
  { name: "Concentration Curl",                 muscle: "biceps", type: "weight_reps" },
  { name: "Zottman Curl",                       muscle: "biceps", type: "weight_reps" },
  { name: "Cable Curl (Straight Bar)",          muscle: "biceps", type: "weight_reps" },
  { name: "Cable Curl (Rope)",                  muscle: "biceps", type: "weight_reps" },
  { name: "Reverse-Grip Cable Curl",            muscle: "biceps", type: "weight_reps" },
  { name: "Single-Arm Cable Curl",              muscle: "biceps", type: "weight_reps" },
  { name: "High Cable Curl",                    muscle: "biceps", type: "weight_reps" },
  { name: "Chin-Up",                            muscle: "biceps", type: "bodyweight_reps" },
  { name: "Inverted Row",                       muscle: "biceps", type: "bodyweight_reps" },

  // ── FOREARMS ──────────────────────────────────────────────
  { name: "Wrist Curl",                         muscle: "forearms", type: "weight_reps" },
  { name: "Reverse Wrist Curl",                 muscle: "forearms", type: "weight_reps" },
  { name: "Behind-the-Back Barbell Wrist Curl", muscle: "forearms", type: "weight_reps" },
  { name: "Single-Arm Dumbbell Wrist Curl",     muscle: "forearms", type: "weight_reps" },
  { name: "Cable Wrist Curl",                   muscle: "forearms", type: "weight_reps" },
  { name: "Dead Hang",                          muscle: "forearms", type: "timed" },
  { name: "Farmer's Carry",                     muscle: "forearms", type: "weight_reps" },
  { name: "Plate Pinch",                        muscle: "forearms", type: "timed" },
  { name: "Towel Pull-Up",                      muscle: "forearms", type: "bodyweight_reps" },
  { name: "Hand Gripper",                       muscle: "forearms", type: "reps_only" },
  { name: "Rice Bucket",                        muscle: "forearms", type: "timed" },

  // ── LEGS ──────────────────────────────────────────────────
  { name: "Back Squat",                         muscle: "legs", type: "weight_reps" },
  { name: "Front Squat",                        muscle: "legs", type: "weight_reps" },
  { name: "Romanian Deadlift",                  muscle: "legs", type: "weight_reps" },
  { name: "Conventional Deadlift",              muscle: "legs", type: "weight_reps" },
  { name: "Sumo Deadlift",                      muscle: "legs", type: "weight_reps" },
  { name: "Good Morning",                       muscle: "legs", type: "weight_reps" },
  { name: "Leg Press",                          muscle: "legs", type: "weight_reps" },
  { name: "Leg Extension",                      muscle: "legs", type: "weight_reps" },
  { name: "Leg Curl",                           muscle: "legs", type: "weight_reps" },
  { name: "Seated Leg Curl",                    muscle: "legs", type: "weight_reps" },
  { name: "Hip Abduction Machine",              muscle: "legs", type: "weight_reps" },
  { name: "Hip Adduction Machine",              muscle: "legs", type: "weight_reps" },
  { name: "Smith Machine Squat",                muscle: "legs", type: "weight_reps" },
  { name: "Hack Squat Machine",                 muscle: "legs", type: "weight_reps" },
  { name: "Dumbbell Squat",                     muscle: "legs", type: "weight_reps" },
  { name: "Dumbbell Romanian Deadlift",         muscle: "legs", type: "weight_reps" },
  { name: "Dumbbell Lunge",                     muscle: "legs", type: "weight_reps" },
  { name: "Dumbbell Step-Up",                   muscle: "legs", type: "weight_reps" },
  { name: "Dumbbell Sumo Squat",                muscle: "legs", type: "weight_reps" },
  { name: "Dumbbell Bulgarian Split Squat",     muscle: "legs", type: "weight_reps" },

  // ── CORE ──────────────────────────────────────────────────
  { name: "Cable Crunch",                       muscle: "core", type: "weight_reps" },
  { name: "Decline Weighted Crunch",            muscle: "core", type: "weight_reps" },
  { name: "Landmine Rotation",                  muscle: "core", type: "weight_reps" },
  { name: "Pallof Press",                       muscle: "core", type: "weight_reps" },
  { name: "Weighted Sit-Up",                    muscle: "core", type: "weight_reps" },
  { name: "Dumbbell Side Bend",                 muscle: "core", type: "weight_reps" },
  { name: "Cable Woodchop",                     muscle: "core", type: "weight_reps" },
  { name: "High-to-Low Cable Chop",             muscle: "core", type: "weight_reps" },
  { name: "Ab Wheel Rollout",                   muscle: "core", type: "reps_only" },
  { name: "Crunch",                             muscle: "core", type: "bodyweight_reps" },
  { name: "Sit-Up",                             muscle: "core", type: "bodyweight_reps" },
  { name: "Reverse Crunch",                     muscle: "core", type: "bodyweight_reps" },
  { name: "Leg Raise",                          muscle: "core", type: "bodyweight_reps" },
  { name: "Hanging Knee Raise",                 muscle: "core", type: "bodyweight_reps" },
  { name: "Bicycle Crunch",                     muscle: "core", type: "bodyweight_reps" },
  { name: "V-Up",                               muscle: "core", type: "bodyweight_reps" },
  { name: "Hanging Leg Raise",                  muscle: "core", type: "bodyweight_reps" },
  { name: "Dragon Flag",                        muscle: "core", type: "bodyweight_reps" },
  { name: "Lying Leg Raise",                    muscle: "core", type: "bodyweight_reps" },
  { name: "Russian Twist",                      muscle: "core", type: "bodyweight_reps" },
  { name: "Bird Dog",                           muscle: "core", type: "bodyweight_reps" },
  { name: "Plank",                              muscle: "core", type: "timed" },
  { name: "Side Plank",                         muscle: "core", type: "timed" },
  { name: "Hollow Body Hold",                   muscle: "core", type: "timed" },
  { name: "Dead Bug",                           muscle: "core", type: "timed" },
  { name: "RKC Plank",                          muscle: "core", type: "timed" },
  { name: "Side Plank with Rotation",           muscle: "core", type: "timed" },
  { name: "Copenhagen Plank",                   muscle: "core", type: "timed" },

  // ── BODYWEIGHT ────────────────────────────────────────────
  // Push
  { name: "Push-Up",                            muscle: "bodyweight", type: "bodyweight_reps" },
  { name: "Wide-Grip Push-Up",                  muscle: "bodyweight", type: "bodyweight_reps" },
  { name: "Diamond Push-Up",                    muscle: "bodyweight", type: "bodyweight_reps" },
  { name: "Pike Push-Up",                       muscle: "bodyweight", type: "bodyweight_reps" },
  { name: "Handstand Push-Up",                  muscle: "bodyweight", type: "bodyweight_reps" },
  { name: "Decline Push-Up",                    muscle: "bodyweight", type: "bodyweight_reps" },
  { name: "Archer Push-Up",                     muscle: "bodyweight", type: "bodyweight_reps" },
  { name: "Close-Grip Push-Up",                 muscle: "bodyweight", type: "bodyweight_reps" },
  // Pull
  { name: "Neutral-Grip Pull-Up",               muscle: "bodyweight", type: "bodyweight_reps" },
  { name: "Scapular Pull-Up",                   muscle: "bodyweight", type: "bodyweight_reps" },
  { name: "Face Pull (Band)",                   muscle: "bodyweight", type: "bodyweight_reps" },
  { name: "Inverted Row (Bodyweight)",          muscle: "bodyweight", type: "bodyweight_reps" },
  // Legs
  { name: "Bodyweight Squat",                   muscle: "bodyweight", type: "bodyweight_reps" },
  { name: "Bulgarian Split Squat",              muscle: "bodyweight", type: "bodyweight_reps" },
  { name: "Reverse Lunge",                      muscle: "bodyweight", type: "bodyweight_reps" },
  { name: "Walking Lunge",                      muscle: "bodyweight", type: "bodyweight_reps" },
  { name: "Pistol Squat",                       muscle: "bodyweight", type: "bodyweight_reps" },
  { name: "Glute Bridge",                       muscle: "bodyweight", type: "bodyweight_reps" },
  { name: "Hip Thrust (Single Leg)",            muscle: "bodyweight", type: "bodyweight_reps" },
  { name: "Nordic Hamstring Curl",              muscle: "bodyweight", type: "bodyweight_reps" },
  { name: "Wall Sit",                           muscle: "bodyweight", type: "timed" },
  { name: "Handstand Hold",                     muscle: "bodyweight", type: "timed" },
  { name: "Bear Crawl",                         muscle: "bodyweight", type: "timed" },
  // Full body explosive
  { name: "Jump Squat",                         muscle: "bodyweight", type: "reps_only" },
  { name: "Burpee",                             muscle: "bodyweight", type: "reps_only" },
  { name: "Mountain Climber",                   muscle: "bodyweight", type: "reps_only" },
  { name: "Jumping Jack",                       muscle: "bodyweight", type: "reps_only" },
  { name: "Box Jump",                           muscle: "bodyweight", type: "reps_only" },
  { name: "Broad Jump",                         muscle: "bodyweight", type: "reps_only" },

  // ── CARDIO ────────────────────────────────────────────────
  { name: "Treadmill",                          muscle: "cardio", type: "cardio" },
  { name: "Incline Treadmill Walk",             muscle: "cardio", type: "cardio" },
  { name: "Stationary Bike",                    muscle: "cardio", type: "cardio" },
  { name: "Rowing Machine",                     muscle: "cardio", type: "cardio" },
  { name: "Elliptical",                         muscle: "cardio", type: "cardio" },
  { name: "Stair Climber",                      muscle: "cardio", type: "cardio" },
  { name: "Ski Erg",                            muscle: "cardio", type: "cardio" },
];

/** Look up measurement type for an exercise name (fallback = weight_reps) */
export function getMeasurementType(name: string): MeasurementType {
  return EXERCISES.find(e => e.name.toLowerCase() === name.toLowerCase())?.type ?? "weight_reps";
}
